import {useEffect, useMemo, useRef} from 'react';
import {useShallow} from 'zustand/react/shallow';
import {getSplitHandlePoint} from '@/features/editor/lib/split-geometry';
import {useEditorStore} from '@/features/editor/state/use-editor-store';
import {useCanvasRenderer} from '@/features/editor/hooks/use-canvas-renderer';
import {useCanvasInteractions} from '@/features/editor/hooks/use-canvas-interactions';
import {BlurOutlineOverlay} from './blur-outline-overlay';
import {BrushCursor} from './brush-cursor';

interface EditorCanvasRootProps {
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
}

export function EditorCanvasRoot({onCanvasReady}: EditorCanvasRootProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const {
    imageWidth,
    imageHeight,
    image2,
    splitDirection,
    splitRatio,
    zoom,
    panX,
    panY,
    activeTool,
    brushRadius,
    showBlurOutlines,
    blurStrokes,
    currentStroke,
    setPan,
  } = useEditorStore(
    useShallow((state) => ({
      imageWidth: state.imageWidth,
      imageHeight: state.imageHeight,
      image2: state.image2,
      splitDirection: state.splitDirection,
      splitRatio: state.splitRatio,
      zoom: state.zoom,
      panX: state.panX,
      panY: state.panY,
      activeTool: state.activeTool,
      brushRadius: state.brushRadius,
      showBlurOutlines: state.showBlurOutlines,
      blurStrokes: state.blurStrokes,
      currentStroke: state.currentStroke,
      setPan: state.setPan,
    })),
  );

  useCanvasRenderer({canvasRef, containerRef, onCanvasReady});

  const {
    isPanning,
    isDraggingSplit,
    isOverSplitHandle,
    cursorPos,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
    handlePointerCancel,
  } = useCanvasInteractions({canvasRef, containerRef});

  const scale = zoom / 100;
  const canvasWidth = imageWidth || 800;
  const canvasHeight = imageHeight || 600;
  const panRef = useRef({x: panX, y: panY});
  const allStrokes = useMemo(
    () => (currentStroke ? [...blurStrokes, currentStroke] : blurStrokes),
    [blurStrokes, currentStroke],
  );

  const isBlurTool = activeTool === 'blur';
  const isSelectTool = activeTool === 'select';
  const splitHandlePoint = useMemo(() => {
    if (!image2) return null;
    return getSplitHandlePoint(canvasWidth, canvasHeight, splitDirection, splitRatio / 100);
  }, [canvasHeight, canvasWidth, image2, splitDirection, splitRatio]);

  const splitCursor =
    splitDirection === 'vertical'
      ? 'ew-resize'
      : splitDirection === 'horizontal'
        ? 'ns-resize'
        : splitDirection === 'diagonal-tl-br'
          ? 'nwse-resize'
          : 'nesw-resize';

  const canvasCursor = isDraggingSplit
    ? 'grabbing'
    : image2 && isOverSplitHandle
      ? splitCursor
      : isPanning
        ? 'grabbing'
        : isSelectTool
          ? 'grab'
          : isBlurTool
            ? 'crosshair'
            : 'default';

  useEffect(() => {
    panRef.current = {x: panX, y: panY};
  }, [panX, panY]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let prevCenter: {x: number; y: number} | null = null;
    const measureCenter = () => {
      const rect = container.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    };

    const syncPanToContainerCenter = () => {
      const nextCenter = measureCenter();
      if (!prevCenter) {
        prevCenter = nextCenter;
        return;
      }

      const dx = prevCenter.x - nextCenter.x;
      const dy = prevCenter.y - nextCenter.y;
      prevCenter = nextCenter;

      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

      const nextPanX = panRef.current.x + dx;
      const nextPanY = panRef.current.y + dy;
      panRef.current = {x: nextPanX, y: nextPanY};
      setPan(nextPanX, nextPanY);
    };

    syncPanToContainerCenter();
    const observer = new ResizeObserver(syncPanToContainerCenter);
    observer.observe(container);
    return () => observer.disconnect();
  }, [setPan]);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-hidden"
      style={{
        background: 'oklch(var(--editor-canvas-bg))',
        cursor: canvasCursor,
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerCancel}>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, oklch(var(--foreground) / 0.14) 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
        }}
      />

      <div
        className="absolute"
        style={{
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) translate(${panX}px, ${panY}px)`,
        }}>
        <div
          style={{
            width: canvasWidth * scale,
            height: canvasHeight * scale,
            position: 'relative',
          }}>
          <canvas
            ref={canvasRef}
            className="border-foreground block border-4 shadow-[8px_8px_0_0_rgba(0,0,0,0.72)]"
            style={{
              width: '100%',
              height: '100%',
              cursor: canvasCursor,
              imageRendering: zoom > 200 ? 'pixelated' : 'auto',
            }}
          />

          {image2 && splitHandlePoint ? (
            <div
              data-testid="split-drag-handle"
              aria-hidden="true"
              className="border-foreground bg-primary pointer-events-none absolute border-2 shadow-[2px_2px_0_0_rgba(0,0,0,0.7)]"
              style={{
                width: 14,
                height: 14,
                left: splitHandlePoint.x * scale,
                top: splitHandlePoint.y * scale,
                transform: 'translate(-50%, -50%)',
              }}
            />
          ) : null}

          <BlurOutlineOverlay
            visible={showBlurOutlines}
            strokes={allStrokes}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
          />

          <BrushCursor
            cursorPos={cursorPos}
            isPanning={isPanning}
            isBlurTool={isBlurTool}
            brushRadius={brushRadius}
            scale={scale}
          />
        </div>
      </div>
    </div>
  );
}
