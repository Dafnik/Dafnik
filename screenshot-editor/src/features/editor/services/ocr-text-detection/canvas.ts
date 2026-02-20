import {drawBaseLayer} from '@/features/editor/hooks/canvas-renderer/layers';
import type {DetectTextInImageOptions} from './types';

export async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to decode image for OCR text detection.'));
    image.src = dataUrl;
  });
}

export function composeBaseImageCanvas(
  image1: HTMLImageElement,
  image2: HTMLImageElement | null,
  options: Pick<
    DetectTextInImageOptions,
    'imageWidth' | 'imageHeight' | 'splitDirection' | 'splitRatio'
  >,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = options.imageWidth;
  canvas.height = options.imageHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to create image composition context.');
  }

  drawBaseLayer(ctx, options.imageWidth, options.imageHeight, {
    image1,
    image2,
    hasSecondImage: Boolean(image2),
    splitDirection: options.splitDirection,
    splitRatio: options.splitRatio,
  });

  return canvas;
}
