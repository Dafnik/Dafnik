import {buildSplitClipPath, drawSplitLine} from './split-path';
import type {SplitDirection} from '@/features/editor/state/types';

interface DrawBaseLayerOptions {
  image1: HTMLImageElement;
  image2: HTMLImageElement | null;
  hasSecondImage: boolean;
  splitDirection: SplitDirection;
  splitRatio: number;
}

export function drawBaseLayer(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: DrawBaseLayerOptions,
) {
  const {image1, image2, hasSecondImage, splitDirection, splitRatio} = options;
  ctx.clearRect(0, 0, width, height);

  if (image2 && hasSecondImage) {
    const ratio = splitRatio / 100;

    ctx.save();
    buildSplitClipPath(ctx, width, height, splitDirection, ratio, 'first');
    ctx.clip();
    ctx.drawImage(image1, 0, 0, width, height);
    ctx.restore();

    ctx.save();
    buildSplitClipPath(ctx, width, height, splitDirection, ratio, 'second');
    ctx.clip();
    ctx.drawImage(image2, 0, 0, width, height);
    ctx.restore();

    drawSplitLine(ctx, width, height, splitDirection, ratio);
  } else {
    ctx.drawImage(image1, 0, 0, width, height);
  }
}
