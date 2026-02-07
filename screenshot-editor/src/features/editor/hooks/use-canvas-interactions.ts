import {useCallback, useEffect, useRef, useState} from 'react';
import type {MouseEvent as ReactMouseEvent, RefObject} from 'react';
import {useEditorStore} from '@/features/editor/state/use-editor-store';

interface UseCanvasInteractionsOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
}

export function useCanvasInteractions({canvasRef, containerRef}: UseCanvasInteractionsOptions) {
  const activeTool = useEditorStore((state) => state.activeTool);
  const panX = useEditorStore((state) => state.panX);
  const panY = useEditorStore((state) => state.panY);
  const zoom = useEditorStore((state) => state.zoom);
  const isDrawing = useEditorStore((state) => state.isDrawing);
  const startStroke = useEditorStore((state) => state.startStroke);
  const appendStrokePoint = useEditorStore((state) => state.appendStrokePoint);
  const finishStroke = useEditorStore((state) => state.finishStroke);
  const setPan = useEditorStore((state) => state.setPan);
  const setZoom = useEditorStore((state) => state.setZoom);

  const [isPanning, setIsPanning] = useState(false);
  const [cursorPos, setCursorPos] = useState<{x: number; y: number} | null>(null);
  const lastPanPos = useRef({x: 0, y: 0});

  const getImageCoords = useCallback(
    (event: ReactMouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return {x: 0, y: 0};

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      return {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY,
      };
    },
    [canvasRef],
  );

  const handleMouseDown = useCallback(
    (event: ReactMouseEvent) => {
      if (event.button === 1 || (event.button === 0 && event.altKey)) {
        setIsPanning(true);
        lastPanPos.current = {x: event.clientX, y: event.clientY};
        return;
      }

      if (event.button !== 0) return;

      if (activeTool === 'select') {
        setIsPanning(true);
        lastPanPos.current = {x: event.clientX, y: event.clientY};
        return;
      }

      const coords = getImageCoords(event);
      startStroke(coords.x, coords.y);
    },
    [activeTool, getImageCoords, startStroke],
  );

  const handleMouseMove = useCallback(
    (event: ReactMouseEvent) => {
      const coords = getImageCoords(event);
      setCursorPos(coords);

      if (isPanning) {
        const dx = event.clientX - lastPanPos.current.x;
        const dy = event.clientY - lastPanPos.current.y;
        lastPanPos.current = {x: event.clientX, y: event.clientY};
        setPan(panX + dx, panY + dy);
        return;
      }

      if (isDrawing) {
        appendStrokePoint(coords.x, coords.y);
      }
    },
    [appendStrokePoint, getImageCoords, isDrawing, isPanning, panX, panY, setPan],
  );

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (isDrawing) {
      finishStroke();
    }
  }, [finishStroke, isDrawing, isPanning]);

  const handleMouseLeave = useCallback(() => {
    setCursorPos(null);

    if (isDrawing) {
      finishStroke();
    }

    if (isPanning) {
      setIsPanning(false);
    }
  }, [finishStroke, isDrawing, isPanning]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const zoomFactor = event.deltaY > 0 ? 0.95 : 1.05;
      const nextZoom = Math.max(10, Math.min(500, Math.round(zoom * zoomFactor)));
      if (nextZoom !== zoom) {
        setZoom(nextZoom);
      }
    };

    container.addEventListener('wheel', handleWheel, {passive: false});
    return () => container.removeEventListener('wheel', handleWheel);
  }, [containerRef, setZoom, zoom]);

  return {
    isPanning,
    cursorPos,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
  };
}
