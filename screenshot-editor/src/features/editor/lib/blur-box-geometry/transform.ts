import type {BlurStroke, Point} from '@/features/editor/state/types';
import type {ResizeHandle} from './handles';
import type {BlurBoxRect} from './outline';

const EPSILON = 1e-4;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function areRectsEqual(a: BlurBoxRect, b: BlurBoxRect): boolean {
  return (
    Math.abs(a.x - b.x) < EPSILON &&
    Math.abs(a.y - b.y) < EPSILON &&
    Math.abs(a.width - b.width) < EPSILON &&
    Math.abs(a.height - b.height) < EPSILON
  );
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
