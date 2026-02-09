import {useCallback, useEffect, useRef} from 'react';
import type {RefObject} from 'react';
import {applyBlurToCanvas} from '@/features/editor/hooks/canvas-renderer/blur-pass';
import {getReusableCanvas} from '@/features/editor/hooks/canvas-renderer/canvas-pool';
import {drawBaseLayer} from '@/features/editor/hooks/canvas-renderer/layers';
import {getRenderPerfStats} from '@/features/editor/hooks/canvas-renderer/perf';
import {useEditorStore} from '@/features/editor/state/use-editor-store';
import type {BlurStroke} from '@/features/editor/state/types';

interface UseCanvasRendererOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
}

interface RenderQueueState {
  frameId: number;
  needsCommittedRebuild: boolean;
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

  const drawCurrentBaseLayer = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const img1 = img1Ref.current;
      if (!img1) return;

      drawBaseLayer(ctx, width, height, {
        image1: img1,
        image2: img2Ref.current,
        hasSecondImage: Boolean(image2),
        splitDirection,
        splitRatio,
      });
    },
    [image2, splitDirection, splitRatio],
  );

  const rebuildCommittedLayer = useCallback(() => {
    const img1 = img1Ref.current;
    if (!img1) return null;

    const width = imageWidth || img1.naturalWidth;
    const height = imageHeight || img1.naturalHeight;

    const committedCanvas = getReusableCanvas(committedLayerRef, width, height);
    const committedCtx = committedCanvas.getContext('2d');
    if (!committedCtx) return null;

    drawCurrentBaseLayer(committedCtx, width, height);
    applyBlurToCanvas(committedCtx, blurStrokes, width, height, {blurScratchRef, pixelScratchRef});

    return committedCanvas;
  }, [blurStrokes, drawCurrentBaseLayer, imageHeight, imageWidth]);

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
        drawCurrentBaseLayer(ctx, width, height);
      }

      if (previewStroke && previewStroke.points.length > 0) {
        applyBlurToCanvas(ctx, [previewStroke], width, height, {blurScratchRef, pixelScratchRef});
      }
    },
    [canvasRef, containerRef, drawCurrentBaseLayer, imageHeight, imageWidth, rebuildCommittedLayer],
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
