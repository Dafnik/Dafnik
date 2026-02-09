import {useCallback, useEffect, useRef, useState} from 'react';
import type {PointerEvent as ReactPointerEvent, RefObject} from 'react';
import {getSplitHandlePoint, getSplitRatioFromPoint} from '@/features/editor/lib/split-geometry';
import type {Point} from '@/features/editor/state/types';
import {useEditorStore} from '@/features/editor/state/use-editor-store';

interface UseCanvasInteractionsOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
}

interface SamplingPerfStats {
  acceptedPoints: number;
  skippedPoints: number;
}

const SPLIT_HANDLE_HIT_RADIUS_PX = 14;
const MIN_ZOOM = 10;
const MAX_ZOOM = 500;
const MIN_POINT_DISTANCE = 0.75;
const MAX_POINT_DISTANCE = 5;
const DIRECTION_CHANGE_DOT_THRESHOLD = 0.96;
const CURSOR_EPSILON = 0.25;

function clampZoom(value: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
}

function clampZoomFloat(value: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
}

function normalizeWheelDelta(event: WheelEvent): number {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return event.deltaY * 16;
  }
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return event.deltaY * (typeof window === 'undefined' ? 800 : window.innerHeight);
  }
  return event.deltaY;
}

function getSamplingPerfStats(): SamplingPerfStats | null {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null;

  const perfTarget = window as unknown as {
    __SCREENSHOT_EDITOR_PERF__?: {sampling?: SamplingPerfStats};
  };
  if (!perfTarget.__SCREENSHOT_EDITOR_PERF__) {
    perfTarget.__SCREENSHOT_EDITOR_PERF__ = {};
  }
  if (!perfTarget.__SCREENSHOT_EDITOR_PERF__.sampling) {
    perfTarget.__SCREENSHOT_EDITOR_PERF__.sampling = {
      acceptedPoints: 0,
      skippedPoints: 0,
    };
  }

  return perfTarget.__SCREENSHOT_EDITOR_PERF__.sampling;
}

function areCursorPositionsEqual(a: Point | null, b: Point | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  return Math.abs(a.x - b.x) < CURSOR_EPSILON && Math.abs(a.y - b.y) < CURSOR_EPSILON;
}

function getAdaptiveSamplingDistance(brushRadius: number, zoom: number): number {
  const zoomFactor = 100 / Math.max(zoom, MIN_ZOOM);
  const adaptiveDistance = brushRadius * 0.12 * zoomFactor;
  return Math.min(MAX_POINT_DISTANCE, Math.max(MIN_POINT_DISTANCE, adaptiveDistance));
}

export function useCanvasInteractions({canvasRef, containerRef}: UseCanvasInteractionsOptions) {
  const hasSecondImage = useEditorStore((state) => Boolean(state.image2));

  const [isPanning, setIsPanning] = useState(false);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [isOverSplitHandle, setIsOverSplitHandle] = useState(false);
  const [cursorPos, setCursorPos] = useState<Point | null>(null);

  const lastPanPos = useRef({x: 0, y: 0});
  const activePointerId = useRef<number | null>(null);
  const wheelZoomResidual = useRef(0);

  const cursorPosRef = useRef<Point | null>(null);
  const pendingCursorPosRef = useRef<Point | null>(null);
  const cursorFrameRef = useRef<number>(0);

  const pendingStrokePointsRef = useRef<Point[]>([]);
  const strokeFrameRef = useRef<number>(0);
  const lastAcceptedPointRef = useRef<Point | null>(null);
  const lastAcceptedVectorRef = useRef<Point | null>(null);

  const getImageCoordsFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return {x: 0, y: 0};

      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return {x: 0, y: 0};
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    },
    [canvasRef],
  );

  const isWithinCanvasBounds = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return false;

      const rect = canvas.getBoundingClientRect();
      return (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      );
    },
    [canvasRef],
  );

  const isPointerNearSplitHandle = useCallback(
    (clientX: number, clientY: number) => {
      const {image2, splitDirection, splitRatio} = useEditorStore.getState();
      const canvas = canvasRef.current;
      if (!canvas || !image2 || canvas.width <= 0 || canvas.height <= 0) return false;

      const rect = canvas.getBoundingClientRect();
      const handlePoint = getSplitHandlePoint(
        canvas.width,
        canvas.height,
        splitDirection,
        splitRatio / 100,
      );

      const handleClientX = rect.left + (handlePoint.x / canvas.width) * rect.width;
      const handleClientY = rect.top + (handlePoint.y / canvas.height) * rect.height;
      const dx = clientX - handleClientX;
      const dy = clientY - handleClientY;

      return Math.hypot(dx, dy) <= SPLIT_HANDLE_HIT_RADIUS_PX;
    },
    [canvasRef],
  );

  const updateSplitRatioFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const {setSplitRatio, splitDirection} = useEditorStore.getState();
      const coords = getImageCoordsFromClient(clientX, clientY);
      const nextRatio = getSplitRatioFromPoint(
        coords.x,
        coords.y,
        canvas.width,
        canvas.height,
        splitDirection,
      );

      setSplitRatio(Math.round(nextRatio * 100), {debouncedHistory: true});
    },
    [canvasRef, getImageCoordsFromClient],
  );

  const releasePointerCapture = useCallback((element: HTMLDivElement, pointerId: number) => {
    if (typeof element.hasPointerCapture !== 'function') return;
    if (typeof element.releasePointerCapture !== 'function') return;
    if (element.hasPointerCapture(pointerId)) {
      element.releasePointerCapture(pointerId);
    }
  }, []);

  const setPointerCapture = useCallback((element: HTMLDivElement, pointerId: number) => {
    if (typeof element.setPointerCapture !== 'function') return;
    element.setPointerCapture(pointerId);
  }, []);

  const hasPointerCapture = useCallback((element: HTMLDivElement, pointerId: number) => {
    if (typeof element.hasPointerCapture !== 'function') return false;
    return element.hasPointerCapture(pointerId);
  }, []);

  const scheduleCursorUpdate = useCallback((nextCursorPos: Point | null) => {
    pendingCursorPosRef.current = nextCursorPos;
    if (cursorFrameRef.current) return;

    cursorFrameRef.current = requestAnimationFrame(() => {
      cursorFrameRef.current = 0;
      const next = pendingCursorPosRef.current;
      if (areCursorPositionsEqual(cursorPosRef.current, next)) return;

      cursorPosRef.current = next;
      setCursorPos(next);
    });
  }, []);

  const resetStrokeQueue = useCallback(() => {
    if (strokeFrameRef.current) {
      cancelAnimationFrame(strokeFrameRef.current);
      strokeFrameRef.current = 0;
    }

    pendingStrokePointsRef.current = [];
  }, []);

  const flushPendingStrokePoints = useCallback(() => {
    if (pendingStrokePointsRef.current.length === 0) return;

    const pendingPoints = pendingStrokePointsRef.current;
    pendingStrokePointsRef.current = [];
    useEditorStore.getState().appendStrokePoints(pendingPoints);
  }, []);

  const scheduleStrokeFlush = useCallback(() => {
    if (strokeFrameRef.current) return;

    strokeFrameRef.current = requestAnimationFrame(() => {
      strokeFrameRef.current = 0;
      flushPendingStrokePoints();
    });
  }, [flushPendingStrokePoints]);

  const queueStrokePoint = useCallback(
    (x: number, y: number, options?: {force: boolean}) => {
      const force = options?.force ?? false;
      const nextPoint = {x, y};
      const previous = lastAcceptedPointRef.current;
      const perfStats = getSamplingPerfStats();

      if (!previous) {
        lastAcceptedPointRef.current = nextPoint;
        pendingStrokePointsRef.current.push(nextPoint);
        scheduleStrokeFlush();
        if (perfStats) {
          perfStats.acceptedPoints += 1;
        }
        return;
      }

      const dx = nextPoint.x - previous.x;
      const dy = nextPoint.y - previous.y;
      const dist = Math.hypot(dx, dy);

      if (dist === 0) {
        if (perfStats) {
          perfStats.skippedPoints += 1;
        }
        return;
      }

      const {brushRadius, zoom} = useEditorStore.getState();
      const minDistance = getAdaptiveSamplingDistance(brushRadius, zoom);

      let shouldAppend = force || dist >= minDistance;

      if (!shouldAppend && dist > 0) {
        const previousVector = lastAcceptedVectorRef.current;
        if (previousVector && dist >= minDistance * 0.5) {
          const nx = dx / dist;
          const ny = dy / dist;
          const prevLen = Math.hypot(previousVector.x, previousVector.y);
          if (prevLen > 0) {
            const pvx = previousVector.x / prevLen;
            const pvy = previousVector.y / prevLen;
            const dot = nx * pvx + ny * pvy;
            shouldAppend = dot < DIRECTION_CHANGE_DOT_THRESHOLD;
          }
        }
      }

      if (!shouldAppend) {
        if (perfStats) {
          perfStats.skippedPoints += 1;
        }
        return;
      }

      pendingStrokePointsRef.current.push(nextPoint);
      lastAcceptedPointRef.current = nextPoint;
      lastAcceptedVectorRef.current = {x: dx, y: dy};
      scheduleStrokeFlush();

      if (perfStats) {
        perfStats.acceptedPoints += 1;
      }
    },
    [scheduleStrokeFlush],
  );

  const finishActiveStroke = useCallback(
    (finalPoint?: Point) => {
      const store = useEditorStore.getState();
      if (!store.isDrawing) return;

      if (finalPoint) {
        queueStrokePoint(finalPoint.x, finalPoint.y, {force: true});
      }

      flushPendingStrokePoints();
      store.finishStroke();

      resetStrokeQueue();
      lastAcceptedPointRef.current = null;
      lastAcceptedVectorRef.current = null;
    },
    [flushPendingStrokePoints, queueStrokePoint, resetStrokeQueue],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0 && event.button !== 1) return;

      if (event.button === 0 && isPointerNearSplitHandle(event.clientX, event.clientY)) {
        event.preventDefault();
        activePointerId.current = event.pointerId;
        setPointerCapture(event.currentTarget, event.pointerId);
        setIsDraggingSplit(true);
        setIsOverSplitHandle(true);
        updateSplitRatioFromClient(event.clientX, event.clientY);
        return;
      }

      if (event.button === 1 || (event.button === 0 && event.altKey)) {
        event.preventDefault();
        activePointerId.current = event.pointerId;
        setPointerCapture(event.currentTarget, event.pointerId);
        setIsPanning(true);
        lastPanPos.current = {x: event.clientX, y: event.clientY};
        return;
      }

      const {activeTool, startStroke} = useEditorStore.getState();

      if (activeTool === 'select') {
        event.preventDefault();
        activePointerId.current = event.pointerId;
        setPointerCapture(event.currentTarget, event.pointerId);
        setIsPanning(true);
        lastPanPos.current = {x: event.clientX, y: event.clientY};
        return;
      }

      if (event.button !== 0) return;
      if (!isWithinCanvasBounds(event.clientX, event.clientY)) return;

      activePointerId.current = event.pointerId;
      setPointerCapture(event.currentTarget, event.pointerId);

      const coords = getImageCoordsFromClient(event.clientX, event.clientY);
      startStroke(coords.x, coords.y);
      resetStrokeQueue();
      lastAcceptedPointRef.current = coords;
      lastAcceptedVectorRef.current = null;
    },
    [
      getImageCoordsFromClient,
      isPointerNearSplitHandle,
      isWithinCanvasBounds,
      resetStrokeQueue,
      setPointerCapture,
      updateSplitRatioFromClient,
    ],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (activePointerId.current !== null && event.pointerId !== activePointerId.current) return;

      const isOverCanvas = isWithinCanvasBounds(event.clientX, event.clientY);
      const coords = getImageCoordsFromClient(event.clientX, event.clientY);
      scheduleCursorUpdate(isOverCanvas ? coords : null);

      if (!isDraggingSplit) {
        const isNearSplitHandle = isPointerNearSplitHandle(event.clientX, event.clientY);
        setIsOverSplitHandle((prev) => (prev === isNearSplitHandle ? prev : isNearSplitHandle));
      }

      if (isDraggingSplit) {
        updateSplitRatioFromClient(event.clientX, event.clientY);
        return;
      }

      if (isPanning) {
        const dx = event.clientX - lastPanPos.current.x;
        const dy = event.clientY - lastPanPos.current.y;
        lastPanPos.current = {x: event.clientX, y: event.clientY};

        const {panX, panY, setPan} = useEditorStore.getState();
        setPan(panX + dx, panY + dy);
        return;
      }

      if (useEditorStore.getState().isDrawing) {
        if (!isOverCanvas) {
          finishActiveStroke();
          return;
        }

        queueStrokePoint(coords.x, coords.y, {force: false});
      }
    },
    [
      finishActiveStroke,
      getImageCoordsFromClient,
      isDraggingSplit,
      isPanning,
      isPointerNearSplitHandle,
      isWithinCanvasBounds,
      queueStrokePoint,
      scheduleCursorUpdate,
      updateSplitRatioFromClient,
    ],
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (activePointerId.current !== null && event.pointerId !== activePointerId.current) return;

      if (isDraggingSplit) {
        setIsDraggingSplit(false);
        setIsOverSplitHandle(isPointerNearSplitHandle(event.clientX, event.clientY));
      }

      if (isPanning) {
        setIsPanning(false);
      }

      const isDrawing = useEditorStore.getState().isDrawing;
      if (isDrawing) {
        const isOverCanvas = isWithinCanvasBounds(event.clientX, event.clientY);
        const finalPoint = isOverCanvas
          ? getImageCoordsFromClient(event.clientX, event.clientY)
          : undefined;
        finishActiveStroke(finalPoint);
      }

      activePointerId.current = null;
      releasePointerCapture(event.currentTarget, event.pointerId);
    },
    [
      finishActiveStroke,
      getImageCoordsFromClient,
      isDraggingSplit,
      isPanning,
      isPointerNearSplitHandle,
      isWithinCanvasBounds,
      releasePointerCapture,
    ],
  );

  const handlePointerLeave = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (activePointerId.current !== null && event.pointerId !== activePointerId.current) return;
      if (hasPointerCapture(event.currentTarget, event.pointerId)) return;

      scheduleCursorUpdate(null);
      setIsOverSplitHandle(false);

      if (useEditorStore.getState().isDrawing) {
        finishActiveStroke();
      }

      if (isPanning) {
        setIsPanning(false);
      }

      if (isDraggingSplit) {
        setIsDraggingSplit(false);
      }

      if (activePointerId.current !== null) {
        releasePointerCapture(event.currentTarget, event.pointerId);
        activePointerId.current = null;
      }
    },
    [
      finishActiveStroke,
      hasPointerCapture,
      isDraggingSplit,
      isPanning,
      releasePointerCapture,
      scheduleCursorUpdate,
    ],
  );

  const handlePointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (activePointerId.current !== null && event.pointerId !== activePointerId.current) return;

      scheduleCursorUpdate(null);
      setIsOverSplitHandle(false);

      if (useEditorStore.getState().isDrawing) {
        finishActiveStroke();
      }

      if (isPanning) {
        setIsPanning(false);
      }

      if (isDraggingSplit) {
        setIsDraggingSplit(false);
      }

      if (activePointerId.current !== null) {
        releasePointerCapture(event.currentTarget, event.pointerId);
        activePointerId.current = null;
      }
    },
    [finishActiveStroke, isDraggingSplit, isPanning, releasePointerCapture, scheduleCursorUpdate],
  );

  useEffect(() => {
    if (hasSecondImage) return;

    if (isDraggingSplit) {
      setIsDraggingSplit(false);
    }
    if (isOverSplitHandle) {
      setIsOverSplitHandle(false);
    }
  }, [hasSecondImage, isDraggingSplit, isOverSplitHandle]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const normalizedDelta = normalizeWheelDelta(event);
      if (normalizedDelta === 0) return;

      const {zoom: currentZoom, panX: currentPanX, panY: currentPanY} = useEditorStore.getState();
      const adjustedDelta = Math.sign(normalizedDelta) * Math.log1p(Math.abs(normalizedDelta));
      const zoomFactor = Math.exp(-adjustedDelta * 0.02);
      const currentZoomFloat = clampZoomFloat(currentZoom + wheelZoomResidual.current);
      const nextZoomFloat = clampZoomFloat(currentZoomFloat * zoomFactor);
      const nextZoom = clampZoom(Math.round(nextZoomFloat));

      wheelZoomResidual.current = nextZoomFloat - nextZoom;

      if (nextZoom === currentZoom) return;

      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        useEditorStore.getState().setZoom(nextZoom);
        return;
      }

      const containerCenterX = rect.left + rect.width / 2;
      const containerCenterY = rect.top + rect.height / 2;
      const pointerOffsetX = event.clientX - containerCenterX;
      const pointerOffsetY = event.clientY - containerCenterY;
      const scaleRatio = nextZoom / currentZoom;

      const nextPanX = scaleRatio * currentPanX + (1 - scaleRatio) * pointerOffsetX;
      const nextPanY = scaleRatio * currentPanY + (1 - scaleRatio) * pointerOffsetY;

      const {setPan, setZoom} = useEditorStore.getState();
      setPan(nextPanX, nextPanY);
      setZoom(nextZoom);
    };

    container.addEventListener('wheel', handleWheel, {passive: false});
    return () => container.removeEventListener('wheel', handleWheel);
  }, [containerRef]);

  useEffect(() => {
    return () => {
      if (cursorFrameRef.current) {
        cancelAnimationFrame(cursorFrameRef.current);
      }
      if (strokeFrameRef.current) {
        cancelAnimationFrame(strokeFrameRef.current);
      }
    };
  }, []);

  return {
    isPanning,
    isDraggingSplit,
    isOverSplitHandle,
    cursorPos,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
    handlePointerCancel,
  };
}
