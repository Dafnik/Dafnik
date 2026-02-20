import type {EmailBoundingBox} from '@/features/editor/lib/email-blur-strokes';
import type {OcrWord} from './types';

function toNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

export function getWordBox(word: OcrWord): EmailBoundingBox | null {
  const bbox = word.bbox;
  if (!bbox) return null;

  const x0 = toNumber(bbox.x0);
  const y0 = toNumber(bbox.y0);
  const x1 = toNumber(bbox.x1);
  const y1 = toNumber(bbox.y1);
  if (x0 !== null && y0 !== null && x1 !== null && y1 !== null) {
    const width = x1 - x0;
    const height = y1 - y0;
    if (width > 0 && height > 0) {
      return {x: x0, y: y0, width, height};
    }
  }

  const x = toNumber(bbox.x);
  const y = toNumber(bbox.y);
  const w = toNumber(bbox.w) ?? toNumber(bbox.width);
  const h = toNumber(bbox.h) ?? toNumber(bbox.height);
  if (x !== null && y !== null && w !== null && h !== null && w > 0 && h > 0) {
    return {x, y, width: w, height: h};
  }

  return null;
}

export function clampBox(
  box: EmailBoundingBox,
  maxWidth: number,
  maxHeight: number,
): EmailBoundingBox | null {
  const x = Math.max(0, Math.min(maxWidth, box.x));
  const y = Math.max(0, Math.min(maxHeight, box.y));
  const right = Math.max(0, Math.min(maxWidth, box.x + box.width));
  const bottom = Math.max(0, Math.min(maxHeight, box.y + box.height));
  const width = right - x;
  const height = bottom - y;

  if (width <= 0 || height <= 0) return null;
  return {x, y, width, height};
}

export function boxesOverlap(a: EmailBoundingBox, b: EmailBoundingBox): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function boxArea(box: EmailBoundingBox): number {
  return box.width * box.height;
}

export function boxContains(container: EmailBoundingBox, candidate: EmailBoundingBox): boolean {
  return (
    candidate.x >= container.x &&
    candidate.y >= container.y &&
    candidate.x + candidate.width <= container.x + container.width &&
    candidate.y + candidate.height <= container.y + container.height
  );
}

export function computeIntersectionArea(a: EmailBoundingBox, b: EmailBoundingBox): number {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  const width = right - left;
  const height = bottom - top;

  if (width <= 0 || height <= 0) return 0;
  return width * height;
}

export function computeIoU(a: EmailBoundingBox, b: EmailBoundingBox): number {
  const intersection = computeIntersectionArea(a, b);
  if (intersection <= 0) return 0;

  const union = boxArea(a) + boxArea(b) - intersection;
  if (union <= 0) return 0;
  return intersection / union;
}

export function unionBoxes(boxes: EmailBoundingBox[]): EmailBoundingBox | null {
  if (boxes.length === 0) return null;

  let minX = boxes[0].x;
  let minY = boxes[0].y;
  let maxX = boxes[0].x + boxes[0].width;
  let maxY = boxes[0].y + boxes[0].height;

  for (let index = 1; index < boxes.length; index += 1) {
    const box = boxes[index];
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function overlapOnSmallerBox(a: EmailBoundingBox, b: EmailBoundingBox): number {
  const intersection = computeIntersectionArea(a, b);
  if (intersection <= 0) return 0;

  const smallerArea = Math.min(boxArea(a), boxArea(b));
  if (smallerArea <= 0) return 0;
  return intersection / smallerArea;
}
