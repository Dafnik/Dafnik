import type {BlurStroke, Point} from '@/features/editor/state/types';

export interface BlurBoxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function normalizeRectFromPoints(start: Point, end: Point): BlurBoxRect {
  const minX = Math.min(start.x, end.x);
  const maxX = Math.max(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const maxY = Math.max(start.y, end.y);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function computeBlurStrokeOutlineRect(
  stroke: BlurStroke,
  canvasWidth: number,
  canvasHeight: number,
): BlurBoxRect | null {
  if ((stroke.shape ?? 'brush') === 'box') {
    if (canvasWidth <= 0 || canvasHeight <= 0) return null;
    const start = stroke.points[0];
    if (!start) return null;
    const end = stroke.points[1] ?? start;
    const raw = normalizeRectFromPoints(start, end);
    const x = clamp(raw.x, 0, Math.max(0, canvasWidth - 1));
    const y = clamp(raw.y, 0, Math.max(0, canvasHeight - 1));
    const right = clamp(raw.x + Math.max(1, raw.width), x + 1, canvasWidth);
    const bottom = clamp(raw.y + Math.max(1, raw.height), y + 1, canvasHeight);
    const width = right - x;
    const height = bottom - y;
    return {x, y, width, height};
  }

  if (stroke.points.length === 0) return null;

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
  const right = Math.min(canvasWidth, maxX + stroke.radius);
  const bottom = Math.min(canvasHeight, maxY + stroke.radius);
  const width = right - x;
  const height = bottom - y;

  if (width <= 0 || height <= 0) return null;
  return {x, y, width, height};
}

export function computeBlurStrokeOutlineRects(
  strokes: BlurStroke[],
  canvasWidth: number,
  canvasHeight: number,
): Array<BlurBoxRect | null> {
  return strokes.map((stroke) => computeBlurStrokeOutlineRect(stroke, canvasWidth, canvasHeight));
}

export function computeRectUnion(rects: Array<BlurBoxRect | null>): BlurBoxRect | null {
  const validRects = rects.filter((rect): rect is BlurBoxRect => rect !== null);
  if (validRects.length === 0) return null;

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const rect of validRects) {
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function isPointInRect(point: Point, rect: BlurBoxRect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function doRectsOverlap(a: BlurBoxRect, b: BlurBoxRect): boolean {
  return (
    a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y
  );
}
