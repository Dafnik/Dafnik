import type {MutableRefObject} from 'react';
import {normalizeRectFromPoints} from '@/features/editor/lib/blur-box-geometry';
import type {BlurStroke} from '@/features/editor/state/types';
import {getReusableCanvas} from './canvas-pool';

interface BlurPassRefs {
  blurScratchRef: MutableRefObject<HTMLCanvasElement | null>;
  pixelScratchRef: MutableRefObject<HTMLCanvasElement | null>;
}

export function applyBlurToCanvas(
  ctx: CanvasRenderingContext2D,
  strokes: BlurStroke[],
  width: number,
  height: number,
  refs: BlurPassRefs,
) {
  if (strokes.length === 0) return;

  const blurScratchCanvas = getReusableCanvas(refs.blurScratchRef, width, height);
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
        const point = stroke.points[i];
        if (i === 0) {
          ctx.arc(point.x, point.y, stroke.radius, 0, Math.PI * 2);
        } else {
          ctx.moveTo(point.x + stroke.radius, point.y);
          ctx.arc(point.x, point.y, stroke.radius, 0, Math.PI * 2);
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
      const pixelScratchCanvas = getReusableCanvas(refs.pixelScratchRef, sw, sh);
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
}
