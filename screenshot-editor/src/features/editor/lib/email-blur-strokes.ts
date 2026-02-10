import type {BlurStroke, BlurType} from '@/features/editor/state/types';

export interface EmailBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CreateEmailBlurStrokesOptions {
  boxes: EmailBoundingBox[];
  imageWidth: number;
  imageHeight: number;
  blurType: BlurType;
  strength: number;
  radius: number;
  paddingPx?: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function createEmailBlurStrokes({
  boxes,
  imageWidth,
  imageHeight,
  blurType,
  strength,
  radius,
  paddingPx = 6,
}: CreateEmailBlurStrokesOptions): BlurStroke[] {
  if (imageWidth <= 0 || imageHeight <= 0) return [];

  const strokes: BlurStroke[] = [];

  for (const box of boxes) {
    if (box.width <= 0 || box.height <= 0) continue;

    const startX = clamp(box.x - paddingPx, 0, imageWidth);
    const startY = clamp(box.y - paddingPx, 0, imageHeight);
    const endX = clamp(box.x + box.width + paddingPx, 0, imageWidth);
    const endY = clamp(box.y + box.height + paddingPx, 0, imageHeight);

    if (endX <= startX || endY <= startY) continue;

    strokes.push({
      points: [
        {x: startX, y: startY},
        {x: endX, y: endY},
      ],
      radius,
      strength,
      blurType,
      shape: 'box',
    });
  }

  return strokes;
}
