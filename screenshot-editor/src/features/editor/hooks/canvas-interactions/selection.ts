import {useCallback, useEffect, useRef, useState} from 'react';
import type {PointerEvent as ReactPointerEvent} from 'react';
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
import {useEditorStore} from '@/features/editor/state/use-editor-store';
import {RESIZE_HANDLE_HIT_SIZE_PX} from './constants';
import type {
  SelectInteractionMode,
  SelectionHookOptions,
  SelectionHookResult,
  SelectTransformSession,
} from './types';

function areIndexListsEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function findTopmostRectIndexAtPoint(
  point: {x: number; y: number},
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

function findTopmostResizeHandleAtPoint(
  point: {x: number; y: number},
  rects: Array<BlurBoxRect | null>,
  handleHitSize: number,
  restrictTo?: Set<number>,
): {index: number; handle: ResizeHandle} | null {
  for (let index = rects.length - 1; index >= 0; index -= 1) {
    if (restrictTo && !restrictTo.has(index)) continue;
    const rect = rects[index];
    if (!rect) continue;

    const handle = hitTestResizeHandle(point, rect, handleHitSize);
    if (handle) {
      return {index, handle};
    }
  }

  return null;
}

export function useSelectionInteractions({
  activeTool,
  blurStrokes,
  canvasRef,
  getImageCoordsFromClient,
  getResizeHandleHitSizeInCanvasSpace,
  isWithinCanvasBounds,
}: SelectionHookOptions): SelectionHookResult {
  const externalSelectedStrokeIndices = useEditorStore((state) => state.selectedStrokeIndices);
  const [selectCursor, setSelectCursor] = useState('default');
  const [selectedStrokeIndices, setSelectedStrokeIndicesState] = useState<number[]>([]);
  const [marqueeRect, setMarqueeRect] = useState<BlurBoxRect | null>(null);

  const selectedStrokeIndicesRef = useRef<number[]>([]);
  const selectInteractionModeRef = useRef<SelectInteractionMode>('idle');
  const marqueeStartRef = useRef<{x: number; y: number} | null>(null);
  const selectTransformSessionRef = useRef<SelectTransformSession | null>(null);

  const setSelectedStrokeIndices = useCallback((next: number[]) => {
    if (areIndexListsEqual(selectedStrokeIndicesRef.current, next)) return;
    selectedStrokeIndicesRef.current = next;
    setSelectedStrokeIndicesState(next);
    useEditorStore.getState().setSelectedStrokeIndices(next);
  }, []);

  const getSelectHoverCursor = useCallback(
    (clientX: number, clientY: number) => {
      if (!isWithinCanvasBounds(clientX, clientY)) return 'default';

      const canvas = canvasRef.current;
      if (!canvas) return 'default';

      const coords = getImageCoordsFromClient(clientX, clientY);
      const strokes = useEditorStore.getState().blurStrokes;
      const rects = computeBlurStrokeOutlineRects(strokes, canvas.width, canvas.height);
      const handleHitSize = getResizeHandleHitSizeInCanvasSpace();

      const selected = selectedStrokeIndicesRef.current;
      if (selected.length === 1) {
        const selectedRect = rects[selected[0]];
        if (selectedRect) {
          const handle = hitTestResizeHandle(coords, selectedRect, handleHitSize);
          if (handle) {
            return getResizeHandleCursor(handle);
          }
        }
      }

      const anyHandleHit = findTopmostResizeHandleAtPoint(coords, rects, handleHitSize);
      if (anyHandleHit) {
        return getResizeHandleCursor(anyHandleHit.handle);
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
    (coords: {x: number; y: number}) => {
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
    (coords: {x: number; y: number}, keepAspectRatio: boolean) => {
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

  const handleSelectPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, coords: {x: number; y: number}) => {
      const store = useEditorStore.getState();
      if (store.activeTool !== 'select') return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rects = computeBlurStrokeOutlineRects(store.blurStrokes, canvas.width, canvas.height);
      const selected = selectedStrokeIndicesRef.current;
      const handleHitSize = getResizeHandleHitSizeInCanvasSpace();

      if (selected.length === 1) {
        const rect = rects[selected[0]];
        if (rect) {
          const handle = hitTestResizeHandle(coords, rect, handleHitSize);
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

      const anyHandleHit = findTopmostResizeHandleAtPoint(coords, rects, handleHitSize);
      if (anyHandleHit) {
        const targetRect = rects[anyHandleHit.index];
        if (targetRect) {
          const nextSelection = [anyHandleHit.index];
          setSelectedStrokeIndices(nextSelection);
          selectTransformSessionRef.current = {
            mode: 'resize',
            pointerStart: coords,
            initialStrokes: store.blurStrokes,
            selectedIndices: nextSelection,
            selectionUnionRect: targetRect,
            singleBaseRect: targetRect,
            baseAspectRatio: targetRect.width / Math.max(targetRect.height, 1e-4),
            resizeHandle: anyHandleHit.handle,
            changed: false,
          };
          selectInteractionModeRef.current = 'resize';
          setSelectCursor(getResizeHandleCursor(anyHandleHit.handle));
          return;
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
      event.preventDefault();
    },
    [canvasRef, getResizeHandleHitSizeInCanvasSpace, setSelectedStrokeIndices],
  );

  const handleSelectPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, coords: {x: number; y: number}) => {
      const store = useEditorStore.getState();
      if (store.activeTool !== 'select') return;

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

        const rects = computeBlurStrokeOutlineRects(store.blurStrokes, canvas.width, canvas.height);
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
    },
    [applySelectMove, applySelectResize, canvasRef, getSelectHoverCursor, setSelectedStrokeIndices],
  );

  const handleSelectPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (
        selectInteractionModeRef.current === 'move' ||
        selectInteractionModeRef.current === 'resize'
      ) {
        commitSelectTransformIfNeeded();
      }

      clearSelectInteraction();
      setSelectCursor(getSelectHoverCursor(event.clientX, event.clientY));
    },
    [clearSelectInteraction, commitSelectTransformIfNeeded, getSelectHoverCursor],
  );

  const handleSelectPointerLeave = useCallback(() => {
    if (selectInteractionModeRef.current === 'marquee') {
      clearSelectInteraction();
    }
    setSelectCursor('default');
  }, [clearSelectInteraction]);

  const handleSelectPointerCancel = useCallback(() => {
    if (selectInteractionModeRef.current !== 'idle') {
      clearSelectInteraction({cancelChanges: true});
    }
    setSelectCursor('default');
  }, [clearSelectInteraction]);

  useEffect(() => {
    const uniqueIndices = [...new Set(externalSelectedStrokeIndices)].filter((index) =>
      Number.isInteger(index),
    );

    if (!areIndexListsEqual(uniqueIndices, selectedStrokeIndicesRef.current)) {
      selectedStrokeIndicesRef.current = uniqueIndices;
      setSelectedStrokeIndicesState(uniqueIndices);
    }
  }, [externalSelectedStrokeIndices]);

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

  return {
    selectCursor,
    selectedStrokeIndices,
    marqueeRect,
    handleSelectPointerDown,
    handleSelectPointerMove,
    handleSelectPointerUp,
    handleSelectPointerLeave,
    handleSelectPointerCancel,
  };
}
