import type {BlurStroke, Point} from '@/features/editor/state/types';

export interface BlurBoxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

export interface ResizeHandlePoint {
  handle: ResizeHandle;
  x: number;
  y: number;
}

const HANDLE_ORDER: ResizeHandle[] = ['nw', 'ne', 'sw', 'se', 'n', 'e', 's', 'w'];
const EPSILON = 1e-4;

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

export function areRectsEqual(a: BlurBoxRect, b: BlurBoxRect): boolean {
  return (
    Math.abs(a.x - b.x) < EPSILON &&
    Math.abs(a.y - b.y) < EPSILON &&
    Math.abs(a.width - b.width) < EPSILON &&
    Math.abs(a.height - b.height) < EPSILON
  );
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

export function getResizeHandleCursor(handle: ResizeHandle): string {
  switch (handle) {
    case 'n':
    case 's':
      return 'ns-resize';
    case 'e':
    case 'w':
      return 'ew-resize';
    case 'nw':
    case 'se':
      return 'nwse-resize';
    case 'ne':
    case 'sw':
      return 'nesw-resize';
    default:
      return 'default';
  }
}

export function getResizeHandlePoints(rect: BlurBoxRect): ResizeHandlePoint[] {
  const left = rect.x;
  const right = rect.x + rect.width;
  const top = rect.y;
  const bottom = rect.y + rect.height;
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;

  return [
    {handle: 'nw', x: left, y: top},
    {handle: 'n', x: centerX, y: top},
    {handle: 'ne', x: right, y: top},
    {handle: 'e', x: right, y: centerY},
    {handle: 'se', x: right, y: bottom},
    {handle: 's', x: centerX, y: bottom},
    {handle: 'sw', x: left, y: bottom},
    {handle: 'w', x: left, y: centerY},
  ];
}

export function hitTestResizeHandle(
  point: Point,
  rect: BlurBoxRect,
  hitSize: number,
): ResizeHandle | null {
  const half = hitSize / 2;
  const handlePoints = getResizeHandlePoints(rect);

  for (const handle of HANDLE_ORDER) {
    const handlePoint = handlePoints.find((candidate) => candidate.handle === handle);
    if (!handlePoint) continue;

    if (
      point.x >= handlePoint.x - half &&
      point.x <= handlePoint.x + half &&
      point.y >= handlePoint.y - half &&
      point.y <= handlePoint.y + half
    ) {
      return handle;
    }
  }

  return null;
}

export function clampRectTranslation(
  rect: BlurBoxRect,
  dx: number,
  dy: number,
  boundsWidth: number,
  boundsHeight: number,
): Point {
  const minDx = -rect.x;
  const maxDx = boundsWidth - (rect.x + rect.width);
  const minDy = -rect.y;
  const maxDy = boundsHeight - (rect.y + rect.height);

  return {
    x: clamp(dx, minDx, maxDx),
    y: clamp(dy, minDy, maxDy),
  };
}

export function resizeRectByHandle(
  rect: BlurBoxRect,
  handle: ResizeHandle,
  dx: number,
  dy: number,
  boundsWidth: number,
  boundsHeight: number,
  minSize = 4,
): BlurBoxRect {
  const minWidth = Math.max(1, Math.min(minSize, boundsWidth));
  const minHeight = Math.max(1, Math.min(minSize, boundsHeight));

  let left = rect.x;
  let right = rect.x + rect.width;
  let top = rect.y;
  let bottom = rect.y + rect.height;

  const hasWest = handle.includes('w');
  const hasEast = handle.includes('e');
  const hasNorth = handle.includes('n');
  const hasSouth = handle.includes('s');

  if (hasWest) {
    left += dx;
    left = clamp(left, 0, right - minWidth);
  }

  if (hasEast) {
    right += dx;
    right = clamp(right, left + minWidth, boundsWidth);
  }

  if (hasNorth) {
    top += dy;
    top = clamp(top, 0, bottom - minHeight);
  }

  if (hasSouth) {
    bottom += dy;
    bottom = clamp(bottom, top + minHeight, boundsHeight);
  }

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

function fitAspectSizeToBounds(
  width: number,
  height: number,
  ratio: number,
  minWidth: number,
  minHeight: number,
  maxWidth: number,
  maxHeight: number,
): {width: number; height: number} {
  let nextWidth = Math.max(width, minWidth);
  let nextHeight = Math.max(height, minHeight);

  if (!Number.isFinite(ratio) || ratio <= 0) {
    return {
      width: clamp(nextWidth, minWidth, maxWidth),
      height: clamp(nextHeight, minHeight, maxHeight),
    };
  }

  if (nextWidth / Math.max(nextHeight, EPSILON) > ratio) {
    nextHeight = nextWidth / ratio;
  } else {
    nextWidth = nextHeight * ratio;
  }

  const minScale = Math.max(
    minWidth / Math.max(nextWidth, EPSILON),
    minHeight / Math.max(nextHeight, EPSILON),
    1,
  );
  nextWidth *= minScale;
  nextHeight *= minScale;

  const maxScale = Math.min(
    maxWidth / Math.max(nextWidth, EPSILON),
    maxHeight / Math.max(nextHeight, EPSILON),
    1,
  );
  nextWidth *= maxScale;
  nextHeight *= maxScale;

  return {width: nextWidth, height: nextHeight};
}

export function resizeRectByHandleWithAspectRatio(
  rect: BlurBoxRect,
  handle: ResizeHandle,
  dx: number,
  dy: number,
  boundsWidth: number,
  boundsHeight: number,
  minSize = 4,
): BlurBoxRect {
  const ratio = Math.max(rect.width, EPSILON) / Math.max(rect.height, EPSILON);
  const minWidth = Math.max(1, Math.min(minSize, boundsWidth));
  const minHeight = Math.max(1, Math.min(minSize, boundsHeight));
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;

  if (handle === 'e' || handle === 'w') {
    const movedX = handle === 'e' ? rect.x + rect.width + dx : rect.x + dx;
    const widthFromCenter = Math.abs(movedX - centerX) * 2;
    const maxWidth = Math.max(1, 2 * Math.min(centerX, boundsWidth - centerX));
    const maxHeight = Math.max(1, 2 * Math.min(centerY, boundsHeight - centerY));
    const size = fitAspectSizeToBounds(
      widthFromCenter,
      widthFromCenter / Math.max(ratio, EPSILON),
      ratio,
      minWidth,
      minHeight,
      maxWidth,
      maxHeight,
    );
    return {
      x: centerX - size.width / 2,
      y: centerY - size.height / 2,
      width: size.width,
      height: size.height,
    };
  }

  if (handle === 'n' || handle === 's') {
    const movedY = handle === 's' ? rect.y + rect.height + dy : rect.y + dy;
    const heightFromCenter = Math.abs(movedY - centerY) * 2;
    const maxWidth = Math.max(1, 2 * Math.min(centerX, boundsWidth - centerX));
    const maxHeight = Math.max(1, 2 * Math.min(centerY, boundsHeight - centerY));
    const size = fitAspectSizeToBounds(
      heightFromCenter * ratio,
      heightFromCenter,
      ratio,
      minWidth,
      minHeight,
      maxWidth,
      maxHeight,
    );
    return {
      x: centerX - size.width / 2,
      y: centerY - size.height / 2,
      width: size.width,
      height: size.height,
    };
  }

  const anchorX = handle.includes('w') ? rect.x + rect.width : rect.x;
  const anchorY = handle.includes('n') ? rect.y + rect.height : rect.y;
  const movedX = handle.includes('w') ? rect.x + dx : rect.x + rect.width + dx;
  const movedY = handle.includes('n') ? rect.y + dy : rect.y + rect.height + dy;
  const rawWidth = Math.abs(anchorX - movedX);
  const rawHeight = Math.abs(anchorY - movedY);

  let maxWidth = boundsWidth;
  let maxHeight = boundsHeight;
  if (handle === 'nw') {
    maxWidth = anchorX;
    maxHeight = anchorY;
  } else if (handle === 'ne') {
    maxWidth = boundsWidth - anchorX;
    maxHeight = anchorY;
  } else if (handle === 'sw') {
    maxWidth = anchorX;
    maxHeight = boundsHeight - anchorY;
  } else if (handle === 'se') {
    maxWidth = boundsWidth - anchorX;
    maxHeight = boundsHeight - anchorY;
  }

  const size = fitAspectSizeToBounds(
    rawWidth,
    rawHeight,
    ratio,
    minWidth,
    minHeight,
    Math.max(minWidth, maxWidth),
    Math.max(minHeight, maxHeight),
  );

  if (handle === 'nw') {
    return {
      x: anchorX - size.width,
      y: anchorY - size.height,
      width: size.width,
      height: size.height,
    };
  }
  if (handle === 'ne') {
    return {x: anchorX, y: anchorY - size.height, width: size.width, height: size.height};
  }
  if (handle === 'sw') {
    return {x: anchorX - size.width, y: anchorY, width: size.width, height: size.height};
  }
  return {x: anchorX, y: anchorY, width: size.width, height: size.height};
}

export function translateStroke(stroke: BlurStroke, dx: number, dy: number): BlurStroke {
  return {
    ...stroke,
    points: stroke.points.map((point) => ({x: point.x + dx, y: point.y + dy})),
  };
}

export function resizeStrokeToRect(
  stroke: BlurStroke,
  fromRect: BlurBoxRect,
  toRect: BlurBoxRect,
): BlurStroke {
  if ((stroke.shape ?? 'brush') === 'box') {
    return {
      ...stroke,
      points: [
        {x: toRect.x, y: toRect.y},
        {x: toRect.x + toRect.width, y: toRect.y + toRect.height},
      ],
    };
  }

  const fromWidth = Math.max(fromRect.width, EPSILON);
  const fromHeight = Math.max(fromRect.height, EPSILON);
  const scaleX = toRect.width / fromWidth;
  const scaleY = toRect.height / fromHeight;
  const radiusScale = Math.max(0.1, (Math.abs(scaleX) + Math.abs(scaleY)) / 2);

  return {
    ...stroke,
    radius: Math.max(1, stroke.radius * radiusScale),
    points: stroke.points.map((point) => {
      const xRatio = (point.x - fromRect.x) / fromWidth;
      const yRatio = (point.y - fromRect.y) / fromHeight;
      return {
        x: toRect.x + xRatio * toRect.width,
        y: toRect.y + yRatio * toRect.height,
      };
    }),
  };
}
