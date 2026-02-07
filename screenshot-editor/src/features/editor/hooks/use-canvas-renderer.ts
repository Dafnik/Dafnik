import {useCallback, useEffect, useRef} from 'react';
import type {RefObject} from 'react';
import {useEditorStore} from '@/features/editor/state/use-editor-store';
import type {BlurStroke, SplitDirection} from '@/features/editor/state/types';
import {getSplitLineSegment} from '@/features/editor/lib/split-geometry';

interface UseCanvasRendererOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
}

export function useCanvasRenderer({
  canvasRef,
  containerRef,
  onCanvasReady,
}: UseCanvasRendererOptions) {
  const image1 = useEditorStore((state) => state.image1);
  const image2 = useEditorStore((state) => state.image2);
  const imageWidth = useEditorStore((state) => state.imageWidth);
  const imageHeight = useEditorStore((state) => state.imageHeight);
  const splitDirection = useEditorStore((state) => state.splitDirection);
  const splitRatio = useEditorStore((state) => state.splitRatio);
  const blurStrokes = useEditorStore((state) => state.blurStrokes);
  const currentStroke = useEditorStore((state) => state.currentStroke);

  const img1Ref = useRef<HTMLImageElement | null>(null);
  const img2Ref = useRef<HTMLImageElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const renderCanvasRef = useRef<() => void>(() => {});

  const allStrokes = currentStroke ? [...blurStrokes, currentStroke] : blurStrokes;

  useEffect(() => {
    onCanvasReady?.(canvasRef.current);
    return () => onCanvasReady?.(null);
  }, [canvasRef, onCanvasReady]);

  const applyBlurToCanvas = useCallback(
    (ctx: CanvasRenderingContext2D, strokes: BlurStroke[], width: number, height: number) => {
      if (strokes.length === 0) return;

      for (const stroke of strokes) {
        if (stroke.points.length === 0) continue;

        ctx.save();

        ctx.beginPath();
        for (let i = 0; i < stroke.points.length; i += 1) {
          const p = stroke.points[i];
          if (i === 0) {
            ctx.arc(p.x, p.y, stroke.radius, 0, Math.PI * 2);
          } else {
            ctx.moveTo(p.x + stroke.radius, p.y);
            ctx.arc(p.x, p.y, stroke.radius, 0, Math.PI * 2);
          }
        }

        for (let i = 1; i < stroke.points.length; i += 1) {
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
          const tempCtx = tempCanvas.getContext('2d');
          if (!tempCtx) continue;
          tempCtx.drawImage(ctx.canvas, 0, 0);

          const smallCanvas = document.createElement('canvas');
          const sw = Math.max(1, Math.round(width / pixelSize));
          const sh = Math.max(1, Math.round(height / pixelSize));
          smallCanvas.width = sw;
          smallCanvas.height = sh;
          const smallCtx = smallCanvas.getContext('2d');
          if (!smallCtx) continue;
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
          const tempCtx = tempCanvas.getContext('2d');
          if (!tempCtx) continue;
          tempCtx.filter = `blur(${blurAmount}px)`;
          tempCtx.drawImage(ctx.canvas, 0, 0);
          ctx.drawImage(tempCanvas, 0, 0);
        }

        ctx.restore();
      }
    },
    [],
  );

  const buildSplitClipPath = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      direction: string,
      ratio: number,
      side: 'first' | 'second',
    ) => {
      ctx.beginPath();

      if (direction === 'horizontal') {
        if (side === 'first') {
          ctx.rect(0, 0, width, height * ratio);
        } else {
          ctx.rect(0, height * ratio, width, height * (1 - ratio));
        }
      } else if (direction === 'vertical') {
        if (side === 'first') {
          ctx.rect(0, 0, width * ratio, height);
        } else {
          ctx.rect(width * ratio, 0, width * (1 - ratio), height);
        }
      } else if (direction === 'diagonal-tl-br') {
        const topX = width * ratio * 2;
        const botX = width * (ratio * 2 - 1);

        if (side === 'first') {
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.min(topX, width), 0);
          if (topX > width) {
            const rightY = height * ((topX - width) / (topX - botX));
            ctx.lineTo(width, rightY);
          }
          if (botX > 0) {
            ctx.lineTo(botX, height);
          }
          if (botX <= 0) {
            const leftY = height * (topX / (topX - botX));
            ctx.lineTo(0, leftY);
          } else {
            ctx.lineTo(0, height);
          }
          ctx.closePath();
        } else {
          ctx.moveTo(width, height);
          ctx.lineTo(Math.max(botX, 0), height);
          if (botX < 0) {
            const leftY = height * (topX / (topX - botX));
            ctx.lineTo(0, leftY);
          }
          if (topX < width) {
            ctx.lineTo(Math.min(topX, width), 0);
          }
          if (topX >= width) {
            const rightY = height * ((topX - width) / (topX - botX));
            ctx.lineTo(width, rightY);
          } else {
            ctx.lineTo(width, 0);
          }
          ctx.lineTo(width, 0);
          ctx.closePath();
        }
      } else {
        const topX = width * (1 - ratio * 2);
        const botX = width * (2 - ratio * 2);

        if (side === 'first') {
          ctx.moveTo(width, 0);
          ctx.lineTo(Math.max(topX, 0), 0);
          if (topX < 0) {
            const leftY = height * (-topX / (botX - topX));
            ctx.lineTo(0, leftY);
          }
          if (botX < width) {
            ctx.lineTo(botX, height);
          }
          if (botX >= width) {
            const rightY = height * ((width - topX) / (botX - topX));
            ctx.lineTo(width, rightY);
          } else {
            ctx.lineTo(width, height);
          }
          ctx.closePath();
        } else {
          ctx.moveTo(0, height);
          ctx.lineTo(Math.min(botX, width), height);
          if (botX > width) {
            const rightY = height * ((width - topX) / (botX - topX));
            ctx.lineTo(width, rightY);
          }
          if (topX > 0) {
            ctx.lineTo(Math.max(topX, 0), 0);
          }
          if (topX <= 0) {
            const leftY = height * (-topX / (botX - topX));
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

  const drawSplitLine = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      direction: SplitDirection,
      ratio: number,
    ) => {
      const segment = getSplitLineSegment(width, height, direction, ratio);

      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(segment.start.x, segment.start.y);
      ctx.lineTo(segment.end.x, segment.end.y);

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

    const width = imageWidth || img1.naturalWidth;
    const height = imageHeight || img1.naturalHeight;

    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    const img2 = img2Ref.current;

    if (img2 && image2) {
      const ratio = splitRatio / 100;

      ctx.save();
      buildSplitClipPath(ctx, width, height, splitDirection, ratio, 'first');
      ctx.clip();
      ctx.drawImage(img1, 0, 0, width, height);
      ctx.restore();

      ctx.save();
      buildSplitClipPath(ctx, width, height, splitDirection, ratio, 'second');
      ctx.clip();
      ctx.drawImage(img2, 0, 0, width, height);
      ctx.restore();

      drawSplitLine(ctx, width, height, splitDirection, ratio);
    } else {
      ctx.drawImage(img1, 0, 0, width, height);
    }

    applyBlurToCanvas(ctx, allStrokes, width, height);
  }, [
    allStrokes,
    applyBlurToCanvas,
    buildSplitClipPath,
    canvasRef,
    containerRef,
    drawSplitLine,
    image2,
    imageHeight,
    imageWidth,
    splitDirection,
    splitRatio,
  ]);
  renderCanvasRef.current = renderCanvas;

  useEffect(() => {
    if (!image1) {
      img1Ref.current = null;
      renderCanvasRef.current();
      return;
    }

    const image = new Image();
    image.crossOrigin = 'anonymous';
    let cancelled = false;
    image.onload = () => {
      if (cancelled) return;
      img1Ref.current = image;
      renderCanvasRef.current();
    };
    image.src = image1;
    return () => {
      cancelled = true;
    };
  }, [image1]);

  useEffect(() => {
    if (!image2) {
      img2Ref.current = null;
      renderCanvasRef.current();
      return;
    }

    const image = new Image();
    image.crossOrigin = 'anonymous';
    let cancelled = false;
    image.onload = () => {
      if (cancelled) return;
      img2Ref.current = image;
      renderCanvasRef.current();
    };
    image.src = image2;
    return () => {
      cancelled = true;
    };
  }, [image2]);

  useEffect(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    animFrameRef.current = requestAnimationFrame(renderCanvas);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [renderCanvas]);
}
