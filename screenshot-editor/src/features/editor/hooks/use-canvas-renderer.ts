import {useCallback, useEffect, useRef} from 'react';
import type {MutableRefObject, RefObject} from 'react';
import {normalizeRectFromPoints} from '@/features/editor/lib/blur-box-geometry';
import {useEditorStore} from '@/features/editor/state/use-editor-store';
import type {BlurStroke, SplitDirection} from '@/features/editor/state/types';
import {getSplitLineSegment} from '@/features/editor/lib/split-geometry';

interface UseCanvasRendererOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
}

interface RenderPerfStats {
  frameCount: number;
  committedRebuilds: number;
  totalRenderMs: number;
  lastRenderMs: number;
}

interface RenderQueueState {
  frameId: number;
  needsCommittedRebuild: boolean;
}

function getRenderPerfStats(): RenderPerfStats | null {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null;

  const perfTarget = window as unknown as {
    __SCREENSHOT_EDITOR_PERF__?: {renderer?: RenderPerfStats};
  };
  if (!perfTarget.__SCREENSHOT_EDITOR_PERF__) {
    perfTarget.__SCREENSHOT_EDITOR_PERF__ = {};
  }
  if (!perfTarget.__SCREENSHOT_EDITOR_PERF__.renderer) {
    perfTarget.__SCREENSHOT_EDITOR_PERF__.renderer = {
      frameCount: 0,
      committedRebuilds: 0,
      totalRenderMs: 0,
      lastRenderMs: 0,
    };
  }

  return perfTarget.__SCREENSHOT_EDITOR_PERF__.renderer;
}

function getReusableCanvas(
  canvasRef: MutableRefObject<HTMLCanvasElement | null>,
  width: number,
  height: number,
): HTMLCanvasElement {
  if (!canvasRef.current) {
    canvasRef.current = document.createElement('canvas');
  }

  const canvas = canvasRef.current;
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  return canvas;
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
  const committedLayerRef = useRef<HTMLCanvasElement | null>(null);
  const blurScratchRef = useRef<HTMLCanvasElement | null>(null);
  const pixelScratchRef = useRef<HTMLCanvasElement | null>(null);

  const renderQueueRef = useRef<RenderQueueState>({frameId: 0, needsCommittedRebuild: false});
  const previewStrokeRef = useRef<BlurStroke | null>(currentStroke);

  useEffect(() => {
    onCanvasReady?.(canvasRef.current);
    return () => onCanvasReady?.(null);
  }, [canvasRef, onCanvasReady]);

  const applyBlurToCanvas = useCallback(
    (ctx: CanvasRenderingContext2D, strokes: BlurStroke[], width: number, height: number) => {
      if (strokes.length === 0) return;

      const blurScratchCanvas = getReusableCanvas(blurScratchRef, width, height);
      const blurScratchCtx = blurScratchCanvas.getContext('2d');
      if (!blurScratchCtx) return;

      for (const stroke of strokes) {
        if (stroke.points.length === 0) continue;

        ctx.save();

        if ((stroke.shape ?? 'brush') === 'box') {
          const start = stroke.points[0];
          const end = stroke.points[1] ?? start;
          const rect = normalizeRectFromPoints(start, end);
          ctx.beginPath();
          ctx.rect(rect.x, rect.y, Math.max(1, rect.width), Math.max(1, rect.height));
        } else {
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
            const dist = Math.hypot(dx, dy);
            if (dist === 0) continue;
            const nx = (-dy / dist) * stroke.radius;
            const ny = (dx / dist) * stroke.radius;
            ctx.moveTo(p0.x + nx, p0.y + ny);
            ctx.lineTo(p1.x + nx, p1.y + ny);
            ctx.lineTo(p1.x - nx, p1.y - ny);
            ctx.lineTo(p0.x - nx, p0.y - ny);
            ctx.closePath();
          }
        }

        ctx.clip();

        if (stroke.blurType === 'pixelated') {
          const pixelSize = Math.max(2, Math.round(stroke.strength * 1.5));

          blurScratchCtx.clearRect(0, 0, width, height);
          blurScratchCtx.drawImage(ctx.canvas, 0, 0);

          const sw = Math.max(1, Math.round(width / pixelSize));
          const sh = Math.max(1, Math.round(height / pixelSize));
          const pixelScratchCanvas = getReusableCanvas(pixelScratchRef, sw, sh);
          const pixelScratchCtx = pixelScratchCanvas.getContext('2d');
          if (!pixelScratchCtx) {
            ctx.restore();
            continue;
          }

          pixelScratchCtx.clearRect(0, 0, sw, sh);
          pixelScratchCtx.imageSmoothingEnabled = false;
          pixelScratchCtx.drawImage(blurScratchCanvas, 0, 0, sw, sh);

          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(pixelScratchCanvas, 0, 0, sw, sh, 0, 0, width, height);
          ctx.imageSmoothingEnabled = true;
        } else {
          const blurAmount = stroke.strength * 2;
          blurScratchCtx.clearRect(0, 0, width, height);
          blurScratchCtx.filter = `blur(${blurAmount}px)`;
          blurScratchCtx.drawImage(ctx.canvas, 0, 0);
          blurScratchCtx.filter = 'none';
          ctx.drawImage(blurScratchCanvas, 0, 0);
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

  const drawBaseLayer = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const img1 = img1Ref.current;
      if (!img1) return;

      const img2 = img2Ref.current;

      ctx.clearRect(0, 0, width, height);

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
    },
    [buildSplitClipPath, drawSplitLine, image2, splitDirection, splitRatio],
  );

  const rebuildCommittedLayer = useCallback(() => {
    const img1 = img1Ref.current;
    if (!img1) return null;

    const width = imageWidth || img1.naturalWidth;
    const height = imageHeight || img1.naturalHeight;

    const committedCanvas = getReusableCanvas(committedLayerRef, width, height);
    const committedCtx = committedCanvas.getContext('2d');
    if (!committedCtx) return null;

    drawBaseLayer(committedCtx, width, height);
    applyBlurToCanvas(committedCtx, blurStrokes, width, height);

    return committedCanvas;
  }, [applyBlurToCanvas, blurStrokes, drawBaseLayer, imageHeight, imageWidth]);

  const renderVisibleLayer = useCallback(
    (previewStroke: BlurStroke | null) => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      const img1 = img1Ref.current;
      if (!canvas || !container || !img1) return;

      const width = imageWidth || img1.naturalWidth;
      const height = imageHeight || img1.naturalHeight;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let committedCanvas = committedLayerRef.current;
      if (
        !committedCanvas ||
        committedCanvas.width !== width ||
        committedCanvas.height !== height
      ) {
        committedCanvas = rebuildCommittedLayer();
      }

      if (committedCanvas) {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(committedCanvas, 0, 0);
      } else {
        drawBaseLayer(ctx, width, height);
      }

      if (previewStroke && previewStroke.points.length > 0) {
        applyBlurToCanvas(ctx, [previewStroke], width, height);
      }
    },
    [
      applyBlurToCanvas,
      canvasRef,
      containerRef,
      drawBaseLayer,
      imageHeight,
      imageWidth,
      rebuildCommittedLayer,
    ],
  );

  const flushRenderQueue = useCallback(() => {
    const queue = renderQueueRef.current;
    queue.frameId = 0;

    const perfStats = getRenderPerfStats();
    const startTime = perfStats ? performance.now() : 0;

    if (queue.needsCommittedRebuild) {
      queue.needsCommittedRebuild = false;
      rebuildCommittedLayer();
      if (perfStats) {
        perfStats.committedRebuilds += 1;
      }
    }

    renderVisibleLayer(previewStrokeRef.current);

    if (perfStats) {
      const renderMs = performance.now() - startTime;
      perfStats.frameCount += 1;
      perfStats.lastRenderMs = renderMs;
      perfStats.totalRenderMs += renderMs;
    }
  }, [rebuildCommittedLayer, renderVisibleLayer]);

  const scheduleRender = useCallback(
    (options?: {rebuildCommitted: boolean; previewStroke: BlurStroke | null}) => {
      if (options) {
        previewStrokeRef.current = options.previewStroke;
        if (options.rebuildCommitted) {
          renderQueueRef.current.needsCommittedRebuild = true;
        }
      }

      if (renderQueueRef.current.frameId) return;
      renderQueueRef.current.frameId = requestAnimationFrame(flushRenderQueue);
    },
    [flushRenderQueue],
  );

  useEffect(() => {
    if (!image1) {
      img1Ref.current = null;
      committedLayerRef.current = null;
      scheduleRender({rebuildCommitted: true, previewStroke: null});
      return;
    }

    const image = new Image();
    image.crossOrigin = 'anonymous';
    let cancelled = false;

    image.onload = () => {
      if (cancelled) return;
      img1Ref.current = image;
      scheduleRender({rebuildCommitted: true, previewStroke: previewStrokeRef.current});
    };
    image.src = image1;

    return () => {
      cancelled = true;
    };
  }, [image1, scheduleRender]);

  useEffect(() => {
    if (!image2) {
      img2Ref.current = null;
      scheduleRender({rebuildCommitted: true, previewStroke: previewStrokeRef.current});
      return;
    }

    const image = new Image();
    image.crossOrigin = 'anonymous';
    let cancelled = false;

    image.onload = () => {
      if (cancelled) return;
      img2Ref.current = image;
      scheduleRender({rebuildCommitted: true, previewStroke: previewStrokeRef.current});
    };
    image.src = image2;

    return () => {
      cancelled = true;
    };
  }, [image2, scheduleRender]);

  useEffect(() => {
    scheduleRender({rebuildCommitted: true, previewStroke: previewStrokeRef.current});
  }, [blurStrokes, image2, imageHeight, imageWidth, scheduleRender, splitDirection, splitRatio]);

  useEffect(() => {
    previewStrokeRef.current = currentStroke;
    scheduleRender({rebuildCommitted: false, previewStroke: currentStroke});
  }, [currentStroke, scheduleRender]);

  useEffect(() => {
    return () => {
      if (renderQueueRef.current.frameId) {
        cancelAnimationFrame(renderQueueRef.current.frameId);
      }
    };
  }, []);
}
