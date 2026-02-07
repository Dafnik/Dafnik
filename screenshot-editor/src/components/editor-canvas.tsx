import React from 'react';

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type {EditorState, BlurStroke} from '@/lib/editor-store';

interface EditorCanvasProps {
  state: EditorState;
  isDrawing: boolean;
  onDrawStart: (x: number, y: number) => void;
  onDrawMove: (x: number, y: number) => void;
  onDrawEnd: () => void;
  onZoomChange: (zoom: number) => void;
  onPanChange: (panX: number, panY: number) => void;
  currentStroke: BlurStroke | null;
  showBlurOutlines: boolean;
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
}

export function EditorCanvas({
  state,
  isDrawing,
  onDrawStart,
  onDrawMove,
  onDrawEnd,
  onZoomChange,
  onPanChange,
  currentStroke,
  showBlurOutlines,
  onCanvasReady,
}: EditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const img1Ref = useRef<HTMLImageElement | null>(null);
  const img2Ref = useRef<HTMLImageElement | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const lastPanPos = useRef({x: 0, y: 0});
  const animFrameRef = useRef<number>(0);
  const [cursorPos, setCursorPos] = useState<{x: number; y: number} | null>(null);
  const canvasW = state.imageWidth || 800;
  const canvasH = state.imageHeight || 600;
  const allStrokes = useMemo(
    () => (currentStroke ? [...state.blurStrokes, currentStroke] : state.blurStrokes),
    [state.blurStrokes, currentStroke],
  );
  const blurOutlineRects = useMemo(() => {
    return allStrokes.flatMap((stroke) => {
      if (stroke.points.length === 0) return [];

      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;

      for (const point of stroke.points) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      }

      const x = Math.max(0, minX - stroke.radius);
      const y = Math.max(0, minY - stroke.radius);
      const right = Math.min(canvasW, maxX + stroke.radius);
      const bottom = Math.min(canvasH, maxY + stroke.radius);
      const width = right - x;
      const height = bottom - y;

      if (width <= 0 || height <= 0) return [];
      return [{x, y, width, height}];
    });
  }, [allStrokes, canvasW, canvasH]);

  // Expose canvas element to parent
  useEffect(() => {
    onCanvasReady?.(canvasRef.current);
    return () => onCanvasReady?.(null);
  }, [onCanvasReady]);

  // Load images
  useEffect(() => {
    if (state.image1) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        img1Ref.current = img;
        renderCanvas();
      };
      img.src = state.image1;
    } else {
      img1Ref.current = null;
    }
  }, [state.image1]);

  useEffect(() => {
    if (state.image2) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        img2Ref.current = img;
        renderCanvas();
      };
      img.src = state.image2;
    } else {
      img2Ref.current = null;
    }
  }, [state.image2]);

  const applyBlurToCanvas = useCallback(
    (ctx: CanvasRenderingContext2D, strokes: BlurStroke[], width: number, height: number) => {
      if (strokes.length === 0) return;

      for (const stroke of strokes) {
        if (stroke.points.length === 0) continue;

        ctx.save();

        // Create clipping path from stroke
        ctx.beginPath();
        for (let i = 0; i < stroke.points.length; i++) {
          const p = stroke.points[i];
          if (i === 0) {
            ctx.arc(p.x, p.y, stroke.radius, 0, Math.PI * 2);
          } else {
            ctx.moveTo(p.x + stroke.radius, p.y);
            ctx.arc(p.x, p.y, stroke.radius, 0, Math.PI * 2);
          }
        }
        // Connect consecutive points with rectangles for smooth coverage
        for (let i = 1; i < stroke.points.length; i++) {
          const p0 = stroke.points[i - 1];
          const p1 = stroke.points[i];
          const dx = p1.x - p0.x;
          const dy = p1.y - p0.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist === 0) continue;
          const nx = (-dy / dist) * stroke.radius;
          const ny = (dx / dist) * stroke.radius;
          ctx.moveTo(p0.x + nx, p0.y + ny);
          ctx.lineTo(p1.x + nx, p1.y + ny);
          ctx.lineTo(p1.x - nx, p1.y - ny);
          ctx.lineTo(p0.x - nx, p0.y - ny);
          ctx.closePath();
        }
        ctx.clip();

        if (stroke.blurType === 'pixelated') {
          const pixelSize = Math.max(2, Math.round(stroke.strength * 1.5));
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = width;
          tempCanvas.height = height;
          const tempCtx = tempCanvas.getContext('2d')!;
          tempCtx.drawImage(ctx.canvas, 0, 0);

          const smallCanvas = document.createElement('canvas');
          const sw = Math.max(1, Math.round(width / pixelSize));
          const sh = Math.max(1, Math.round(height / pixelSize));
          smallCanvas.width = sw;
          smallCanvas.height = sh;
          const smallCtx = smallCanvas.getContext('2d')!;
          smallCtx.imageSmoothingEnabled = false;
          smallCtx.drawImage(tempCanvas, 0, 0, sw, sh);

          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(smallCanvas, 0, 0, sw, sh, 0, 0, width, height);
          ctx.imageSmoothingEnabled = true;
        } else {
          const blurAmount = stroke.strength * 2;
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = width;
          tempCanvas.height = height;
          const tempCtx = tempCanvas.getContext('2d')!;
          tempCtx.filter = `blur(${blurAmount}px)`;
          tempCtx.drawImage(ctx.canvas, 0, 0);
          ctx.drawImage(tempCanvas, 0, 0);
        }

        ctx.restore();
      }
    },
    [],
  );

  // Helper to build the clip path for a split region
  const buildSplitClipPath = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      w: number,
      h: number,
      direction: string,
      ratio: number,
      side: 'first' | 'second',
    ) => {
      ctx.beginPath();

      if (direction === 'horizontal') {
        if (side === 'first') {
          ctx.rect(0, 0, w, h * ratio);
        } else {
          ctx.rect(0, h * ratio, w, h * (1 - ratio));
        }
      } else if (direction === 'vertical') {
        if (side === 'first') {
          ctx.rect(0, 0, w * ratio, h);
        } else {
          ctx.rect(w * ratio, 0, w * (1 - ratio), h);
        }
      } else if (direction === 'diagonal-tl-br') {
        // Diagonal from top-left to bottom-right
        // The split line goes from (w * ratio * 2, 0) to (0, h) when ratio=0.5
        // More precisely: line from top edge to bottom edge, shifted by ratio
        const topX = w * ratio * 2; // where the line crosses the top (clamped)
        const botX = w * (ratio * 2 - 1); // where the line crosses the bottom

        if (side === 'first') {
          // Top-left region
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.min(topX, w), 0);
          if (topX > w) {
            // line exits through the right edge
            const rightY = h * ((topX - w) / (topX - botX));
            ctx.lineTo(w, rightY);
          }
          if (botX > 0) {
            ctx.lineTo(botX, h);
          }
          if (botX <= 0) {
            // line exits through the left edge
            const leftY = h * (topX / (topX - botX));
            ctx.lineTo(0, leftY);
          } else {
            ctx.lineTo(0, h);
          }
          ctx.closePath();
        } else {
          // Bottom-right region
          ctx.moveTo(w, h);
          ctx.lineTo(Math.max(botX, 0), h);
          if (botX < 0) {
            const leftY = h * (topX / (topX - botX));
            ctx.lineTo(0, leftY);
          }
          if (topX < w) {
            ctx.lineTo(Math.min(topX, w), 0);
          }
          if (topX >= w) {
            const rightY = h * ((topX - w) / (topX - botX));
            ctx.lineTo(w, rightY);
          } else {
            ctx.lineTo(w, 0);
          }
          ctx.lineTo(w, 0);
          ctx.closePath();
        }
      } else {
        // diagonal-tr-bl: Diagonal from top-right to bottom-left
        const topX = w * (1 - ratio * 2); // where the line crosses the top
        const botX = w * (2 - ratio * 2); // where the line crosses the bottom

        if (side === 'first') {
          // Top-right region
          ctx.moveTo(w, 0);
          ctx.lineTo(Math.max(topX, 0), 0);
          if (topX < 0) {
            const leftY = h * (-topX / (botX - topX));
            ctx.lineTo(0, leftY);
          }
          if (botX < w) {
            ctx.lineTo(botX, h);
          }
          if (botX >= w) {
            const rightY = h * ((w - topX) / (botX - topX));
            ctx.lineTo(w, rightY);
          } else {
            ctx.lineTo(w, h);
          }
          ctx.closePath();
        } else {
          // Bottom-left region
          ctx.moveTo(0, h);
          ctx.lineTo(Math.min(botX, w), h);
          if (botX > w) {
            const rightY = h * ((w - topX) / (botX - topX));
            ctx.lineTo(w, rightY);
          }
          if (topX > 0) {
            ctx.lineTo(Math.max(topX, 0), 0);
          }
          if (topX <= 0) {
            const leftY = h * (-topX / (botX - topX));
            ctx.lineTo(0, leftY);
          } else {
            ctx.lineTo(0, 0);
          }
          ctx.lineTo(0, 0);
          ctx.closePath();
        }
      }
    },
    [],
  );

  // Draw the split line
  const drawSplitLine = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number, direction: string, ratio: number) => {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();

      if (direction === 'horizontal') {
        ctx.moveTo(0, h * ratio);
        ctx.lineTo(w, h * ratio);
      } else if (direction === 'vertical') {
        ctx.moveTo(w * ratio, 0);
        ctx.lineTo(w * ratio, h);
      } else if (direction === 'diagonal-tl-br') {
        const topX = w * ratio * 2;
        const botX = w * (ratio * 2 - 1);
        const clampedTopX = Math.max(0, Math.min(w, topX));
        const clampedBotX = Math.max(0, Math.min(w, botX));
        // Compute Y at edges if line exits through left/right
        let startX = clampedTopX,
          startY = 0;
        let endX = clampedBotX,
          endY = h;
        if (topX > w) {
          startX = w;
          startY = h * ((topX - w) / (topX - botX));
        }
        if (botX < 0) {
          endX = 0;
          endY = h * (topX / (topX - botX));
        }
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
      } else {
        // diagonal-tr-bl
        const topX = w * (1 - ratio * 2);
        const botX = w * (2 - ratio * 2);
        const clampedTopX = Math.max(0, Math.min(w, topX));
        const clampedBotX = Math.max(0, Math.min(w, botX));
        let startX = clampedTopX,
          startY = 0;
        let endX = clampedBotX,
          endY = h;
        if (topX < 0) {
          startX = 0;
          startY = h * (-topX / (botX - topX));
        }
        if (botX > w) {
          endX = w;
          endY = h * ((w - topX) / (botX - topX));
        }
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
      }
      ctx.stroke();
      ctx.restore();
    },
    [],
  );

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img1 = img1Ref.current;
    if (!img1) return;

    const w = state.imageWidth || img1.naturalWidth;
    const h = state.imageHeight || img1.naturalHeight;

    canvas.width = w;
    canvas.height = h;

    ctx.clearRect(0, 0, w, h);

    const img2 = img2Ref.current;

    if (img2 && state.image2) {
      const {splitDirection, splitRatio} = state;
      const ratio = splitRatio / 100;

      // Draw image 1 (first half)
      ctx.save();
      buildSplitClipPath(ctx, w, h, splitDirection, ratio, 'first');
      ctx.clip();
      ctx.drawImage(img1, 0, 0, w, h);
      ctx.restore();

      // Draw image 2 (second half)
      ctx.save();
      buildSplitClipPath(ctx, w, h, splitDirection, ratio, 'second');
      ctx.clip();
      ctx.drawImage(img2, 0, 0, w, h);
      ctx.restore();

      // Draw split line
      drawSplitLine(ctx, w, h, splitDirection, ratio);
    } else {
      ctx.drawImage(img1, 0, 0, w, h);
    }

    applyBlurToCanvas(ctx, allStrokes, w, h);
  }, [state, allStrokes, applyBlurToCanvas, buildSplitClipPath, drawSplitLine]);

  // Re-render on state changes
  useEffect(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(renderCanvas);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [renderCanvas]);

  const getImageCoords = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return {x: 0, y: 0};
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Middle click or alt+click always pans
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        setIsPanning(true);
        lastPanPos.current = {x: e.clientX, y: e.clientY};
        return;
      }
      if (e.button === 0) {
        // Select tool: left click pans
        if (state.activeTool === 'select') {
          setIsPanning(true);
          lastPanPos.current = {x: e.clientX, y: e.clientY};
          return;
        }
        // Blur tool: left click draws
        const coords = getImageCoords(e);
        onDrawStart(coords.x, coords.y);
      }
    },
    [getImageCoords, onDrawStart, state.activeTool],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const coords = getImageCoords(e);
      setCursorPos(coords);

      if (isPanning) {
        const dx = e.clientX - lastPanPos.current.x;
        const dy = e.clientY - lastPanPos.current.y;
        lastPanPos.current = {x: e.clientX, y: e.clientY};
        onPanChange(state.panX + dx, state.panY + dy);
        return;
      }
      if (isDrawing) {
        onDrawMove(coords.x, coords.y);
      }
    },
    [isPanning, isDrawing, getImageCoords, onDrawMove, onPanChange, state.panX, state.panY],
  );

  const handleMouseUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }
    if (isDrawing) {
      onDrawEnd();
    }
  }, [isPanning, isDrawing, onDrawEnd]);

  // Native wheel handler to prevent browser zoom and control canvas zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Proportional zoom: faster at high zoom, slower at low zoom
      const zoomFactor = e.deltaY > 0 ? 0.95 : 1.05;
      const currentZoom = state.zoom;
      const newZoom = Math.max(10, Math.min(500, Math.round(currentZoom * zoomFactor)));
      if (newZoom !== currentZoom) {
        onZoomChange(newZoom);
      }
    };

    container.addEventListener('wheel', handleWheel, {passive: false});
    return () => container.removeEventListener('wheel', handleWheel);
  }, [state.zoom, onZoomChange]);

  const scale = state.zoom / 100;
  const isBlurTool = state.activeTool === 'blur';
  const isSelectTool = state.activeTool === 'select';

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-hidden"
      style={{background: 'hsl(var(--editor-canvas-bg))'}}>
      {/* Dot grid background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, hsl(var(--foreground) / 0.12) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />
      <div
        className="absolute"
        style={{
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) translate(${state.panX}px, ${state.panY}px)`,
        }}>
        <div
          style={{
            width: canvasW * scale,
            height: canvasH * scale,
            position: 'relative',
          }}>
          <canvas
            ref={canvasRef}
            className="block shadow-2xl"
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
              imageRendering: state.zoom > 200 ? 'pixelated' : 'auto',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              setCursorPos(null);
              if (isDrawing) onDrawEnd();
              if (isPanning) setIsPanning(false);
            }}
          />
          {showBlurOutlines && blurOutlineRects.length > 0 && (
            <svg
              className="pointer-events-none absolute inset-0"
              viewBox={`0 0 ${canvasW} ${canvasH}`}
              preserveAspectRatio="none">
              {blurOutlineRects.map((rect, index) => (
                <rect
                  key={`${rect.x}-${rect.y}-${rect.width}-${rect.height}-${index}`}
                  x={rect.x}
                  y={rect.y}
                  width={rect.width}
                  height={rect.height}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
          )}
          {/* Brush cursor preview */}
          {cursorPos && !isPanning && isBlurTool && (
            <div
              className="pointer-events-none absolute rounded-full border-2 border-white/60"
              style={{
                width: state.brushRadius * 2 * scale,
                height: state.brushRadius * 2 * scale,
                left: cursorPos.x * scale - state.brushRadius * scale,
                top: cursorPos.y * scale - state.brushRadius * scale,
                boxShadow: '0 0 0 1px rgba(0,0,0,0.3)',
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
