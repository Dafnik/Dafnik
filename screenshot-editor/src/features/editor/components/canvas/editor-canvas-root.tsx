import {useMemo, useRef} from 'react';
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

  const imageWidth = useEditorStore((state) => state.imageWidth);
  const imageHeight = useEditorStore((state) => state.imageHeight);
  const zoom = useEditorStore((state) => state.zoom);
  const panX = useEditorStore((state) => state.panX);
  const panY = useEditorStore((state) => state.panY);
  const activeTool = useEditorStore((state) => state.activeTool);
  const brushRadius = useEditorStore((state) => state.brushRadius);
  const showBlurOutlines = useEditorStore((state) => state.showBlurOutlines);
  const blurStrokes = useEditorStore((state) => state.blurStrokes);
  const currentStroke = useEditorStore((state) => state.currentStroke);

  useCanvasRenderer({canvasRef, containerRef, onCanvasReady});

  const {isPanning, cursorPos, handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave} =
    useCanvasInteractions({canvasRef, containerRef});

  const scale = zoom / 100;
  const canvasWidth = imageWidth || 800;
  const canvasHeight = imageHeight || 600;
  const allStrokes = useMemo(
    () => (currentStroke ? [...blurStrokes, currentStroke] : blurStrokes),
    [blurStrokes, currentStroke],
  );

  const isBlurTool = activeTool === 'blur';
  const isSelectTool = activeTool === 'select';

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-hidden"
      style={{
        background: 'oklch(var(--editor-canvas-bg))',
        cursor: isPanning ? 'grabbing' : isSelectTool ? 'grab' : 'default',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}>
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
              cursor: isPanning
                ? 'grabbing'
                : isSelectTool
                  ? 'grab'
                  : isBlurTool
                    ? 'crosshair'
                    : 'default',
              imageRendering: zoom > 200 ? 'pixelated' : 'auto',
            }}
          />

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
