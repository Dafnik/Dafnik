import {useCallback, useEffect, useRef, useState} from 'react';
import type {PointerEvent as ReactPointerEvent, RefObject} from 'react';
import {
  areRectsEqual,
  clampRectTranslation,
  computeBlurStrokeOutlineRects,
  computeRectUnion,
  getResizeHandleCursor,
  hitTestResizeHandle,
  isPointInRect,
  normalizeRectFromPoints,
  resizeRectByHandle,
  resizeRectByHandleWithAspectRatio,
  resizeStrokeToRect,
  translateStroke,
  type BlurBoxRect,
  type ResizeHandle,
} from '@/features/editor/lib/blur-box-geometry';
import {getSplitHandlePoint, getSplitRatioFromPoint} from '@/features/editor/lib/split-geometry';
import type {BlurStroke, Point} from '@/features/editor/state/types';
import {useEditorStore} from '@/features/editor/state/use-editor-store';

interface UseCanvasInteractionsOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
}

interface SamplingPerfStats {
  acceptedPoints: number;
  skippedPoints: number;
}

type SelectInteractionMode = 'idle' | 'marquee' | 'move' | 'resize';

interface SelectTransformSession {
  mode: 'move' | 'resize';
  pointerStart: Point;
  initialStrokes: BlurStroke[];
  selectedIndices: number[];
  selectionUnionRect: BlurBoxRect | null;
  singleBaseRect: BlurBoxRect | null;
  baseAspectRatio: number | null;
  resizeHandle: ResizeHandle | null;
  changed: boolean;
}

const SPLIT_HANDLE_HIT_RADIUS_PX = 14;
const RESIZE_HANDLE_HIT_SIZE_PX = 14;
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

function areIndexListsEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function findTopmostRectIndexAtPoint(
  point: Point,
  rects: Array<BlurBoxRect | null>,
  restrictTo?: Set<number>,
): number | null {
  for (let index = rects.length - 1; index >= 0; index -= 1) {
    if (restrictTo && !restrictTo.has(index)) continue;
    const rect = rects[index];
    if (!rect) continue;
    if (isPointInRect(point, rect)) return index;
  }

  return null;
}

export function useCanvasInteractions({canvasRef, containerRef}: UseCanvasInteractionsOptions) {
  const hasSecondImage = useEditorStore((state) => Boolean(state.image2));
  const activeTool = useEditorStore((state) => state.activeTool);
  const blurStrokes = useEditorStore((state) => state.blurStrokes);

  const [isPanning, setIsPanning] = useState(false);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [isOverSplitHandle, setIsOverSplitHandle] = useState(false);
  const [cursorPos, setCursorPos] = useState<Point | null>(null);
  const [selectCursor, setSelectCursor] = useState('default');
  const [selectedStrokeIndices, setSelectedStrokeIndicesState] = useState<number[]>([]);
  const [marqueeRect, setMarqueeRect] = useState<BlurBoxRect | null>(null);

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

  const selectedStrokeIndicesRef = useRef<number[]>([]);
  const selectInteractionModeRef = useRef<SelectInteractionMode>('idle');
  const marqueeStartRef = useRef<Point | null>(null);
  const selectTransformSessionRef = useRef<SelectTransformSession | null>(null);

  const setSelectedStrokeIndices = useCallback((next: number[]) => {
    if (areIndexListsEqual(selectedStrokeIndicesRef.current, next)) return;
    selectedStrokeIndicesRef.current = next;
    setSelectedStrokeIndicesState(next);
  }, []);

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

  const getResizeHandleHitSizeInCanvasSpace = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return RESIZE_HANDLE_HIT_SIZE_PX;

    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return RESIZE_HANDLE_HIT_SIZE_PX;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return RESIZE_HANDLE_HIT_SIZE_PX * Math.max(scaleX, scaleY);
  }, [canvasRef]);

  const clampPointToCanvas = useCallback(
    (point: Point): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return point;
      return {
        x: Math.max(0, Math.min(canvas.width, point.x)),
        y: Math.max(0, Math.min(canvas.height, point.y)),
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
      if (!store.isDrawing || !store.currentStroke) return;
      const strokeShape = store.currentStroke.shape ?? 'brush';

      if (strokeShape === 'box') {
        if (finalPoint) {
          store.setCurrentStrokeEndpoint(finalPoint.x, finalPoint.y);
        }
        store.finishStroke();
        resetStrokeQueue();
        lastAcceptedPointRef.current = null;
        lastAcceptedVectorRef.current = null;
        return;
      }

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

  const getSelectHoverCursor = useCallback(
    (clientX: number, clientY: number) => {
      if (!isWithinCanvasBounds(clientX, clientY)) return 'default';

      const canvas = canvasRef.current;
      if (!canvas) return 'default';

      const coords = getImageCoordsFromClient(clientX, clientY);
      const strokes = useEditorStore.getState().blurStrokes;
      const rects = computeBlurStrokeOutlineRects(strokes, canvas.width, canvas.height);

      const selected = selectedStrokeIndicesRef.current;
      if (selected.length === 1) {
        const selectedRect = rects[selected[0]];
        if (selectedRect) {
          const handle = hitTestResizeHandle(
            coords,
            selectedRect,
            getResizeHandleHitSizeInCanvasSpace(),
          );
          if (handle) {
            return getResizeHandleCursor(handle);
          }
        }
      }

      const selectedSet = new Set(selected);
      const selectedHit = findTopmostRectIndexAtPoint(coords, rects, selectedSet);
      if (selectedHit !== null) return 'move';

      const anyHit = findTopmostRectIndexAtPoint(coords, rects);
      if (anyHit !== null) return 'move';

      return 'crosshair';
    },
    [
      canvasRef,
      getImageCoordsFromClient,
      getResizeHandleHitSizeInCanvasSpace,
      isWithinCanvasBounds,
    ],
  );

  const applySelectMove = useCallback(
    (coords: Point) => {
      const session = selectTransformSessionRef.current;
      const canvas = canvasRef.current;
      if (!session || session.mode !== 'move' || !session.selectionUnionRect || !canvas) return;

      const rawDx = coords.x - session.pointerStart.x;
      const rawDy = coords.y - session.pointerStart.y;
      const clampedDelta = clampRectTranslation(
        session.selectionUnionRect,
        rawDx,
        rawDy,
        canvas.width,
        canvas.height,
      );

      const changed = Math.abs(clampedDelta.x) > 1e-4 || Math.abs(clampedDelta.y) > 1e-4;
      session.changed = changed;
      if (!changed) {
        useEditorStore.setState({
          blurStrokes: session.initialStrokes,
        });
        return;
      }

      const selectedSet = new Set(session.selectedIndices);
      const nextStrokes = session.initialStrokes.map((stroke, index) => {
        if (!selectedSet.has(index)) return stroke;
        return translateStroke(stroke, clampedDelta.x, clampedDelta.y);
      });

      useEditorStore.setState({
        blurStrokes: nextStrokes,
        isDrawing: false,
        currentStroke: null,
      });
    },
    [canvasRef],
  );

  const applySelectResize = useCallback(
    (coords: Point, keepAspectRatio: boolean) => {
      const session = selectTransformSessionRef.current;
      const canvas = canvasRef.current;
      if (
        !session ||
        session.mode !== 'resize' ||
        !canvas ||
        !session.singleBaseRect ||
        !session.resizeHandle ||
        session.selectedIndices.length !== 1
      ) {
        return;
      }

      const rawDx = coords.x - session.pointerStart.x;
      const rawDy = coords.y - session.pointerStart.y;
      const nextRect =
        keepAspectRatio && session.baseAspectRatio
          ? resizeRectByHandleWithAspectRatio(
              session.singleBaseRect,
              session.resizeHandle,
              rawDx,
              rawDy,
              canvas.width,
              canvas.height,
            )
          : resizeRectByHandle(
              session.singleBaseRect,
              session.resizeHandle,
              rawDx,
              rawDy,
              canvas.width,
              canvas.height,
            );

      session.changed = !areRectsEqual(session.singleBaseRect, nextRect);
      if (!session.changed) {
        useEditorStore.setState({
          blurStrokes: session.initialStrokes,
        });
        return;
      }

      const [targetIndex] = session.selectedIndices;
      const nextStrokes = [...session.initialStrokes];
      nextStrokes[targetIndex] = resizeStrokeToRect(
        session.initialStrokes[targetIndex],
        session.singleBaseRect,
        nextRect,
      );

      useEditorStore.setState({
        blurStrokes: nextStrokes,
        isDrawing: false,
        currentStroke: null,
      });
    },
    [canvasRef],
  );

  const clearSelectInteraction = useCallback((options?: {cancelChanges?: boolean}) => {
    const session = selectTransformSessionRef.current;
    if (options?.cancelChanges && session?.changed) {
      useEditorStore.setState({blurStrokes: session.initialStrokes});
    }

    marqueeStartRef.current = null;
    setMarqueeRect(null);
    selectTransformSessionRef.current = null;
    selectInteractionModeRef.current = 'idle';
  }, []);

  const commitSelectTransformIfNeeded = useCallback(() => {
    const session = selectTransformSessionRef.current;
    if (!session?.changed) return;
    useEditorStore.getState().pushHistorySnapshot();
  }, []);

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

      const store = useEditorStore.getState();
      if (event.button !== 0) return;

      if (store.activeTool !== 'drag' && !isWithinCanvasBounds(event.clientX, event.clientY))
        return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      activePointerId.current = event.pointerId;
      setPointerCapture(event.currentTarget, event.pointerId);

      if (store.activeTool === 'drag') {
        event.preventDefault();
        setIsPanning(true);
        lastPanPos.current = {x: event.clientX, y: event.clientY};
        return;
      }

      const coords = getImageCoordsFromClient(event.clientX, event.clientY);
      if (store.activeTool === 'select') {
        event.preventDefault();
        const rects = computeBlurStrokeOutlineRects(store.blurStrokes, canvas.width, canvas.height);
        const selected = selectedStrokeIndicesRef.current;

        if (selected.length === 1) {
          const rect = rects[selected[0]];
          if (rect) {
            const handle = hitTestResizeHandle(coords, rect, getResizeHandleHitSizeInCanvasSpace());
            if (handle) {
              selectTransformSessionRef.current = {
                mode: 'resize',
                pointerStart: coords,
                initialStrokes: store.blurStrokes,
                selectedIndices: [...selected],
                selectionUnionRect: rect,
                singleBaseRect: rect,
                baseAspectRatio: rect.width / Math.max(rect.height, 1e-4),
                resizeHandle: handle,
                changed: false,
              };
              selectInteractionModeRef.current = 'resize';
              setSelectCursor(getResizeHandleCursor(handle));
              return;
            }
          }
        }

        const selectedSet = new Set(selected);
        const selectedHitIndex = findTopmostRectIndexAtPoint(coords, rects, selectedSet);
        if (selectedHitIndex !== null && selected.length > 0) {
          const unionRect = computeRectUnion(
            selected.map((index) => (index >= 0 ? (rects[index] ?? null) : null)),
          );
          if (unionRect) {
            selectTransformSessionRef.current = {
              mode: 'move',
              pointerStart: coords,
              initialStrokes: store.blurStrokes,
              selectedIndices: [...selected],
              selectionUnionRect: unionRect,
              singleBaseRect: null,
              baseAspectRatio: null,
              resizeHandle: null,
              changed: false,
            };
            selectInteractionModeRef.current = 'move';
            setSelectCursor('move');
            return;
          }
        }

        const hitIndex = findTopmostRectIndexAtPoint(coords, rects);
        if (hitIndex !== null) {
          const nextSelection = [hitIndex];
          setSelectedStrokeIndices(nextSelection);
          const hitRect = rects[hitIndex];
          if (hitRect) {
            selectTransformSessionRef.current = {
              mode: 'move',
              pointerStart: coords,
              initialStrokes: store.blurStrokes,
              selectedIndices: nextSelection,
              selectionUnionRect: hitRect,
              singleBaseRect: null,
              baseAspectRatio: null,
              resizeHandle: null,
              changed: false,
            };
            selectInteractionModeRef.current = 'move';
            setSelectCursor('move');
            return;
          }
        }

        selectInteractionModeRef.current = 'marquee';
        marqueeStartRef.current = coords;
        setMarqueeRect({x: coords.x, y: coords.y, width: 0, height: 0});
        setSelectedStrokeIndices([]);
        setSelectCursor('crosshair');
        return;
      }

      const blurShape = event.shiftKey ? 'box' : 'brush';
      store.startStroke(coords.x, coords.y, {shape: blurShape});
      resetStrokeQueue();
      lastAcceptedPointRef.current = blurShape === 'brush' ? coords : null;
      lastAcceptedVectorRef.current = null;
    },
    [
      canvasRef,
      getImageCoordsFromClient,
      getResizeHandleHitSizeInCanvasSpace,
      isPointerNearSplitHandle,
      isWithinCanvasBounds,
      resetStrokeQueue,
      setPointerCapture,
      setSelectedStrokeIndices,
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

      const store = useEditorStore.getState();
      if (store.activeTool === 'select') {
        const mode = selectInteractionModeRef.current;
        if (mode === 'move') {
          applySelectMove(coords);
          return;
        }

        if (mode === 'resize') {
          applySelectResize(coords, event.shiftKey);
          return;
        }

        if (mode === 'marquee') {
          const start = marqueeStartRef.current;
          const canvas = canvasRef.current;
          if (!start || !canvas) return;

          const nextMarqueeRect = normalizeRectFromPoints(start, coords);
          setMarqueeRect(nextMarqueeRect);

          const rects = computeBlurStrokeOutlineRects(
            store.blurStrokes,
            canvas.width,
            canvas.height,
          );
          const nextSelection = rects.flatMap((rect, index) =>
            rect && nextMarqueeRect.width >= 0 && nextMarqueeRect.height >= 0
              ? rect.x <= nextMarqueeRect.x + nextMarqueeRect.width &&
                rect.x + rect.width >= nextMarqueeRect.x &&
                rect.y <= nextMarqueeRect.y + nextMarqueeRect.height &&
                rect.y + rect.height >= nextMarqueeRect.y
                ? [index]
                : []
              : [],
          );

          setSelectedStrokeIndices(nextSelection);
          return;
        }

        setSelectCursor(getSelectHoverCursor(event.clientX, event.clientY));
        return;
      }

      if (store.isDrawing) {
        const currentStrokeShape = store.currentStroke?.shape ?? 'brush';
        if (currentStrokeShape === 'box') {
          const clampedCoords = clampPointToCanvas(coords);
          store.setCurrentStrokeEndpoint(clampedCoords.x, clampedCoords.y);
          return;
        }

        if (!isOverCanvas) {
          finishActiveStroke();
          return;
        }

        queueStrokePoint(coords.x, coords.y, {force: false});
      }
    },
    [
      applySelectMove,
      applySelectResize,
      canvasRef,
      clampPointToCanvas,
      finishActiveStroke,
      getImageCoordsFromClient,
      getSelectHoverCursor,
      isDraggingSplit,
      isPanning,
      isPointerNearSplitHandle,
      isWithinCanvasBounds,
      queueStrokePoint,
      scheduleCursorUpdate,
      setSelectedStrokeIndices,
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

      const store = useEditorStore.getState();
      if (store.activeTool === 'select') {
        if (
          selectInteractionModeRef.current === 'move' ||
          selectInteractionModeRef.current === 'resize'
        ) {
          commitSelectTransformIfNeeded();
        }

        clearSelectInteraction();
        setSelectCursor(getSelectHoverCursor(event.clientX, event.clientY));
      }

      const isDrawing = store.isDrawing;
      if (isDrawing) {
        const isBoxStroke = (store.currentStroke?.shape ?? 'brush') === 'box';
        const isOverCanvas = isWithinCanvasBounds(event.clientX, event.clientY);
        const finalPoint = isBoxStroke
          ? clampPointToCanvas(getImageCoordsFromClient(event.clientX, event.clientY))
          : isOverCanvas
            ? getImageCoordsFromClient(event.clientX, event.clientY)
            : undefined;
        finishActiveStroke(finalPoint);
      }

      activePointerId.current = null;
      releasePointerCapture(event.currentTarget, event.pointerId);
    },
    [
      clearSelectInteraction,
      commitSelectTransformIfNeeded,
      clampPointToCanvas,
      finishActiveStroke,
      getImageCoordsFromClient,
      getSelectHoverCursor,
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

      if (selectInteractionModeRef.current === 'marquee') {
        clearSelectInteraction();
      }

      setSelectCursor('default');

      if (activePointerId.current !== null) {
        releasePointerCapture(event.currentTarget, event.pointerId);
        activePointerId.current = null;
      }
    },
    [
      clearSelectInteraction,
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

      if (selectInteractionModeRef.current !== 'idle') {
        clearSelectInteraction({cancelChanges: true});
      }

      setSelectCursor('default');

      if (activePointerId.current !== null) {
        releasePointerCapture(event.currentTarget, event.pointerId);
        activePointerId.current = null;
      }
    },
    [
      clearSelectInteraction,
      finishActiveStroke,
      isDraggingSplit,
      isPanning,
      releasePointerCapture,
      scheduleCursorUpdate,
    ],
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
    if (activeTool === 'select') return;

    clearSelectInteraction({cancelChanges: true});
    setSelectedStrokeIndices([]);
    setSelectCursor('default');
  }, [activeTool, clearSelectInteraction, setSelectedStrokeIndices]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rects = computeBlurStrokeOutlineRects(blurStrokes, canvas.width, canvas.height);
    const filtered = selectedStrokeIndicesRef.current.filter((index) => {
      if (index < 0 || index >= rects.length) return false;
      return Boolean(rects[index]);
    });

    if (!areIndexListsEqual(filtered, selectedStrokeIndicesRef.current)) {
      setSelectedStrokeIndices(filtered);
    }
  }, [blurStrokes, canvasRef, setSelectedStrokeIndices]);

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
    selectCursor,
    selectedStrokeIndices,
    marqueeRect,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
    handlePointerCancel,
  };
}
