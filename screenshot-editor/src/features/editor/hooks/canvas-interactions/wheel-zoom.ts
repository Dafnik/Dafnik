import {useEffect, useRef} from 'react';
import type {RefObject} from 'react';
import {useEditorStore} from '@/features/editor/state/use-editor-store';
import {clampZoom, clampZoomFloat, normalizeWheelDelta} from './constants';

interface UseCanvasWheelZoomOptions {
  containerRef: RefObject<HTMLDivElement | null>;
}

export function useCanvasWheelZoom({containerRef}: UseCanvasWheelZoomOptions) {
  const wheelZoomResidual = useRef(0);

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
}
