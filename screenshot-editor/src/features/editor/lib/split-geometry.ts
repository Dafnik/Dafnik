import type {SplitDirection} from '@/features/editor/state/types';

export interface SplitPoint {
  x: number;
  y: number;
}

export interface SplitLineSegment {
  start: SplitPoint;
  end: SplitPoint;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function getSplitLineSegment(
  width: number,
  height: number,
  direction: SplitDirection,
  ratio01: number,
): SplitLineSegment {
  if (width <= 0 || height <= 0) {
    return {
      start: {x: 0, y: 0},
      end: {x: 0, y: 0},
    };
  }

  const ratio = clamp01(ratio01);

  if (direction === 'horizontal') {
    const y = height * ratio;
    return {
      start: {x: 0, y},
      end: {x: width, y},
    };
  }

  if (direction === 'vertical') {
    const x = width * ratio;
    return {
      start: {x, y: 0},
      end: {x, y: height},
    };
  }

  if (direction === 'diagonal-tl-br') {
    const topX = width * ratio * 2;
    const botX = width * (ratio * 2 - 1);
    const clampedTopX = Math.max(0, Math.min(width, topX));
    const clampedBotX = Math.max(0, Math.min(width, botX));
    let startX = clampedTopX;
    let startY = 0;
    let endX = clampedBotX;
    let endY = height;

    if (topX > width) {
      startX = width;
      startY = height * ((topX - width) / (topX - botX));
    }
    if (botX < 0) {
      endX = 0;
      endY = height * (topX / (topX - botX));
    }

    return {
      start: {x: startX, y: startY},
      end: {x: endX, y: endY},
    };
  }

  const topX = width * (1 - ratio * 2);
  const botX = width * (2 - ratio * 2);
  const clampedTopX = Math.max(0, Math.min(width, topX));
  const clampedBotX = Math.max(0, Math.min(width, botX));
  let startX = clampedTopX;
  let startY = 0;
  let endX = clampedBotX;
  let endY = height;

  if (topX < 0) {
    startX = 0;
    startY = height * (-topX / (botX - topX));
  }
  if (botX > width) {
    endX = width;
    endY = height * ((width - topX) / (botX - topX));
  }

  return {
    start: {x: startX, y: startY},
    end: {x: endX, y: endY},
  };
}

export function getSplitHandlePoint(
  width: number,
  height: number,
  direction: SplitDirection,
  ratio01: number,
): SplitPoint {
  const segment = getSplitLineSegment(width, height, direction, ratio01);
  return {
    x: (segment.start.x + segment.end.x) / 2,
    y: (segment.start.y + segment.end.y) / 2,
  };
}

export function getSplitRatioFromPoint(
  x: number,
  y: number,
  width: number,
  height: number,
  direction: SplitDirection,
): number {
  if (width <= 0 || height <= 0) return 0.5;

  const xRatio = x / width;
  const yRatio = y / height;

  if (direction === 'vertical') {
    return clamp01(xRatio);
  }

  if (direction === 'horizontal') {
    return clamp01(yRatio);
  }

  if (direction === 'diagonal-tl-br') {
    return clamp01((xRatio + yRatio) / 2);
  }

  return clamp01((1 + yRatio - xRatio) / 2);
}
