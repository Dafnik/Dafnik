import {useCallback, useEffect, useRef, useState} from 'react';
import type {PointerEvent as ReactPointerEvent, RefObject} from 'react';
import {getSplitHandlePoint, getSplitRatioFromPoint} from '@/features/editor/lib/split-geometry';
import {useEditorStore} from '@/features/editor/state/use-editor-store';

interface UseCanvasInteractionsOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
}

const SPLIT_HANDLE_HIT_RADIUS_PX = 14;
const MIN_ZOOM = 10;
const MAX_ZOOM = 500;

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

export function useCanvasInteractions({canvasRef, containerRef}: UseCanvasInteractionsOptions) {
  const activeTool = useEditorStore((state) => state.activeTool);
  const image2 = useEditorStore((state) => state.image2);
  const splitDirection = useEditorStore((state) => state.splitDirection);
  const splitRatio = useEditorStore((state) => state.splitRatio);
  const panX = useEditorStore((state) => state.panX);
  const panY = useEditorStore((state) => state.panY);
  const isDrawing = useEditorStore((state) => state.isDrawing);
  const startStroke = useEditorStore((state) => state.startStroke);
  const appendStrokePoint = useEditorStore((state) => state.appendStrokePoint);
  const finishStroke = useEditorStore((state) => state.finishStroke);
  const setSplitRatio = useEditorStore((state) => state.setSplitRatio);
  const setPan = useEditorStore((state) => state.setPan);
  const setZoom = useEditorStore((state) => state.setZoom);

  const [isPanning, setIsPanning] = useState(false);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [isOverSplitHandle, setIsOverSplitHandle] = useState(false);
  const [cursorPos, setCursorPos] = useState<{x: number; y: number} | null>(null);
  const lastPanPos = useRef({x: 0, y: 0});
  const activePointerId = useRef<number | null>(null);
  const wheelZoomResidual = useRef(0);

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
    [canvasRef, image2, splitDirection, splitRatio],
  );

  const updateSplitRatioFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

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
    [canvasRef, getImageCoordsFromClient, setSplitRatio, splitDirection],
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
    },
    [
      activeTool,
      getImageCoordsFromClient,
      isPointerNearSplitHandle,
      isWithinCanvasBounds,
      setPointerCapture,
      startStroke,
      updateSplitRatioFromClient,
    ],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (activePointerId.current !== null && event.pointerId !== activePointerId.current) return;

      const isOverCanvas = isWithinCanvasBounds(event.clientX, event.clientY);
      const coords = getImageCoordsFromClient(event.clientX, event.clientY);
      setCursorPos(isOverCanvas ? coords : null);

      if (!isDraggingSplit) {
        setIsOverSplitHandle(isPointerNearSplitHandle(event.clientX, event.clientY));
      }

      if (isDraggingSplit) {
        updateSplitRatioFromClient(event.clientX, event.clientY);
        return;
      }

      if (isPanning) {
        const dx = event.clientX - lastPanPos.current.x;
        const dy = event.clientY - lastPanPos.current.y;
        lastPanPos.current = {x: event.clientX, y: event.clientY};
        setPan(panX + dx, panY + dy);
        return;
      }

      if (isDrawing) {
        if (!isOverCanvas) {
          finishStroke();
          return;
        }
        appendStrokePoint(coords.x, coords.y);
      }
    },
    [
      appendStrokePoint,
      finishStroke,
      getImageCoordsFromClient,
      isDraggingSplit,
      isPointerNearSplitHandle,
      isDrawing,
      isPanning,
      isWithinCanvasBounds,
      panX,
      panY,
      setPan,
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

      if (isDrawing) {
        finishStroke();
      }

      activePointerId.current = null;
      releasePointerCapture(event.currentTarget, event.pointerId);
    },
    [
      finishStroke,
      isDraggingSplit,
      isDrawing,
      isPanning,
      isPointerNearSplitHandle,
      releasePointerCapture,
    ],
  );

  const handlePointerLeave = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (activePointerId.current !== null && event.pointerId !== activePointerId.current) return;
      if (hasPointerCapture(event.currentTarget, event.pointerId)) return;

      setCursorPos(null);
      setIsOverSplitHandle(false);

      if (isDrawing) {
        finishStroke();
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
    [finishStroke, hasPointerCapture, isDraggingSplit, isDrawing, isPanning, releasePointerCapture],
  );

  const handlePointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (activePointerId.current !== null && event.pointerId !== activePointerId.current) return;

      setCursorPos(null);
      setIsOverSplitHandle(false);

      if (isDrawing) {
        finishStroke();
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
    [finishStroke, isDraggingSplit, isDrawing, isPanning, releasePointerCapture],
  );

  useEffect(() => {
    if (image2) return;

    if (isDraggingSplit) {
      setIsDraggingSplit(false);
    }
    if (isOverSplitHandle) {
      setIsOverSplitHandle(false);
    }
  }, [image2, isDraggingSplit, isOverSplitHandle]);

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
        setZoom(nextZoom);
        return;
      }

      const containerCenterX = rect.left + rect.width / 2;
      const containerCenterY = rect.top + rect.height / 2;
      const pointerOffsetX = event.clientX - containerCenterX;
      const pointerOffsetY = event.clientY - containerCenterY;
      const scaleRatio = nextZoom / currentZoom;

      const nextPanX = scaleRatio * currentPanX + (1 - scaleRatio) * pointerOffsetX;
      const nextPanY = scaleRatio * currentPanY + (1 - scaleRatio) * pointerOffsetY;

      setPan(nextPanX, nextPanY);
      setZoom(nextZoom);
    };

    container.addEventListener('wheel', handleWheel, {passive: false});
    return () => container.removeEventListener('wheel', handleWheel);
  }, [containerRef, setPan, setZoom]);

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
