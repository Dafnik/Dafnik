import {getSplitLineSegment} from '@/features/editor/lib/split-geometry';
import type {SplitDirection} from '@/features/editor/state/types';

export function buildSplitClipPath(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  direction: string,
  ratio: number,
  side: 'first' | 'second',
) {
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
}

export function drawSplitLine(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  direction: SplitDirection,
  ratio: number,
) {
  const segment = getSplitLineSegment(width, height, direction, ratio);

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(segment.start.x, segment.start.y);
  ctx.lineTo(segment.end.x, segment.end.y);
  ctx.stroke();
  ctx.restore();
}
