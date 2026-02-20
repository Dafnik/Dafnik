import {useCallback, useEffect, useRef, useState} from 'react';
import type {PointerEvent as ReactPointerEvent} from 'react';
import type {Point} from '@/features/editor/state/types';
import {useEditorStore} from '@/features/editor/state/use-editor-store';
import {
  areCursorPositionsEqual,
  RESIZE_HANDLE_HIT_SIZE_PX,
  SPLIT_HANDLE_HIT_RADIUS_PX,
} from './canvas-interactions/constants';
import {
  beginPointerSession,
  cancelPointerSessionIfNeeded,
  endPointerSession,
  isDifferentActivePointer,
  isPointerHoverOutsideCapturedSession,
} from './canvas-interactions/pointer-session';
import {useSelectionInteractions} from './canvas-interactions/selection';
import {
  computeSplitRatioFromClient,
  isPointerNearSplitHandle as detectPointerNearSplitHandle,
} from './canvas-interactions/split-drag';
import {useStrokeSampling} from './canvas-interactions/stroke-sampling';
import type {UseCanvasInteractionsOptions} from './canvas-interactions/types';
import {useCanvasWheelZoom} from './canvas-interactions/wheel-zoom';

export function useCanvasInteractions({canvasRef, containerRef}: UseCanvasInteractionsOptions) {
  const hasSecondImage = useEditorStore((state) => Boolean(state.image2));
  const activeTool = useEditorStore((state) => state.activeTool);
  const blurStrokes = useEditorStore((state) => state.blurStrokes);

  const [isPanning, setIsPanning] = useState(false);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [isOverSplitHandle, setIsOverSplitHandle] = useState(false);
  const [cursorPos, setCursorPos] = useState<Point | null>(null);

  const lastPanPos = useRef({x: 0, y: 0});
  const activePointerId = useRef<number | null>(null);

  const cursorPosRef = useRef<Point | null>(null);
  const pendingCursorPosRef = useRef<Point | null>(null);
  const cursorFrameRef = useRef<number>(0);

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
      return detectPointerNearSplitHandle(
        canvasRef.current,
        clientX,
        clientY,
        SPLIT_HANDLE_HIT_RADIUS_PX,
        {image2, splitDirection, splitRatio},
      );
    },
    [canvasRef],
  );

  const updateSplitRatioFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const {setSplitRatio, splitDirection} = useEditorStore.getState();
      const nextRatio = computeSplitRatioFromClient(
        canvasRef.current,
        clientX,
        clientY,
        splitDirection,
        getImageCoordsFromClient,
      );
      if (nextRatio === null) return;

      setSplitRatio(Math.round(nextRatio * 100), {debouncedHistory: true});
    },
    [canvasRef, getImageCoordsFromClient],
  );

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

  const {queueStrokePoint, finishActiveStroke, startStrokeSampling} = useStrokeSampling();

  const {
    selectCursor,
    selectedStrokeIndices,
    marqueeRect,
    handleSelectPointerDown,
    handleSelectPointerMove,
    handleSelectPointerUp,
    handleSelectPointerLeave,
    handleSelectPointerCancel,
  } = useSelectionInteractions({
    activeTool,
    blurStrokes,
    canvasRef,
    getImageCoordsFromClient,
    getResizeHandleHitSizeInCanvasSpace,
    isWithinCanvasBounds,
  });

  useCanvasWheelZoom({containerRef});

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      useEditorStore.getState().setIsShiftPressed(event.shiftKey);
      if (event.button !== 0 && event.button !== 1) return;

      if (event.button === 0 && isPointerNearSplitHandle(event.clientX, event.clientY)) {
        event.preventDefault();
        beginPointerSession(activePointerId, event.currentTarget, event.pointerId);
        setIsDraggingSplit(true);
        setIsOverSplitHandle(true);
        updateSplitRatioFromClient(event.clientX, event.clientY);
        return;
      }

      if (event.button === 1 || (event.button === 0 && event.altKey)) {
        event.preventDefault();
        beginPointerSession(activePointerId, event.currentTarget, event.pointerId);
        setIsPanning(true);
        lastPanPos.current = {x: event.clientX, y: event.clientY};
        return;
      }

      const store = useEditorStore.getState();
      if (event.button !== 0) return;

      if (store.activeTool !== 'drag' && !isWithinCanvasBounds(event.clientX, event.clientY)) {
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;

      beginPointerSession(activePointerId, event.currentTarget, event.pointerId);

      if (store.activeTool === 'drag') {
        event.preventDefault();
        setIsPanning(true);
        lastPanPos.current = {x: event.clientX, y: event.clientY};
        return;
      }

      const coords = getImageCoordsFromClient(event.clientX, event.clientY);
      if (store.activeTool === 'select') {
        event.preventDefault();
        handleSelectPointerDown(event, coords);
        return;
      }

      const blurShape = event.shiftKey
        ? store.blurStrokeShape === 'brush'
          ? 'box'
          : 'brush'
        : store.blurStrokeShape;
      store.startStroke(coords.x, coords.y, {shape: blurShape});
      startStrokeSampling(coords, blurShape);
    },
    [
      canvasRef,
      getImageCoordsFromClient,
      handleSelectPointerDown,
      isPointerNearSplitHandle,
      isWithinCanvasBounds,
      startStrokeSampling,
      updateSplitRatioFromClient,
    ],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      useEditorStore.getState().setIsShiftPressed(event.shiftKey);
      if (isDifferentActivePointer(activePointerId, event.pointerId)) return;

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
        handleSelectPointerMove(event, coords);
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
      clampPointToCanvas,
      finishActiveStroke,
      getImageCoordsFromClient,
      handleSelectPointerMove,
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
      useEditorStore.getState().setIsShiftPressed(event.shiftKey);
      if (isDifferentActivePointer(activePointerId, event.pointerId)) return;

      if (isDraggingSplit) {
        setIsDraggingSplit(false);
        setIsOverSplitHandle(isPointerNearSplitHandle(event.clientX, event.clientY));
      }

      if (isPanning) {
        setIsPanning(false);
      }

      const store = useEditorStore.getState();
      if (store.activeTool === 'select') {
        handleSelectPointerUp(event);
      }

      if (store.isDrawing) {
        const isBoxStroke = (store.currentStroke?.shape ?? 'brush') === 'box';
        const isOverCanvas = isWithinCanvasBounds(event.clientX, event.clientY);
        const finalPoint = isBoxStroke
          ? clampPointToCanvas(getImageCoordsFromClient(event.clientX, event.clientY))
          : isOverCanvas
            ? getImageCoordsFromClient(event.clientX, event.clientY)
            : undefined;
        finishActiveStroke(finalPoint);
      }

      endPointerSession(activePointerId, event.currentTarget, event.pointerId);
    },
    [
      clampPointToCanvas,
      finishActiveStroke,
      getImageCoordsFromClient,
      handleSelectPointerUp,
      isDraggingSplit,
      isPanning,
      isPointerNearSplitHandle,
      isWithinCanvasBounds,
    ],
  );

  const handlePointerLeave = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (isDifferentActivePointer(activePointerId, event.pointerId)) return;
      if (isPointerHoverOutsideCapturedSession(event.currentTarget, event.pointerId)) return;

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

      handleSelectPointerLeave();

      cancelPointerSessionIfNeeded(activePointerId, event.currentTarget, event.pointerId);
    },
    [
      finishActiveStroke,
      handleSelectPointerLeave,
      isDraggingSplit,
      isPanning,
      scheduleCursorUpdate,
    ],
  );

  const handlePointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      useEditorStore.getState().setIsShiftPressed(false);
      if (isDifferentActivePointer(activePointerId, event.pointerId)) return;

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

      handleSelectPointerCancel();

      cancelPointerSessionIfNeeded(activePointerId, event.currentTarget, event.pointerId);
    },
    [
      finishActiveStroke,
      handleSelectPointerCancel,
      isDraggingSplit,
      isPanning,
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
    return () => {
      if (cursorFrameRef.current) {
        cancelAnimationFrame(cursorFrameRef.current);
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
