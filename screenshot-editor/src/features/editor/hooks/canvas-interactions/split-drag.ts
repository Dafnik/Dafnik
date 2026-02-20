import {getSplitHandlePoint, getSplitRatioFromPoint} from '@/features/editor/lib/split-geometry';
import type {SplitDirection} from '@/features/editor/state/types';

interface SplitDragState {
  image2: string | null;
  splitDirection: SplitDirection;
  splitRatio: number;
}

export function isPointerNearSplitHandle(
  canvas: HTMLCanvasElement | null,
  clientX: number,
  clientY: number,
  hitRadiusPx: number,
  state: SplitDragState,
): boolean {
  if (!canvas || !state.image2 || canvas.width <= 0 || canvas.height <= 0) return false;

  const rect = canvas.getBoundingClientRect();
  const handlePoint = getSplitHandlePoint(
    canvas.width,
    canvas.height,
    state.splitDirection,
    state.splitRatio / 100,
  );

  const handleClientX = rect.left + (handlePoint.x / canvas.width) * rect.width;
  const handleClientY = rect.top + (handlePoint.y / canvas.height) * rect.height;
  const dx = clientX - handleClientX;
  const dy = clientY - handleClientY;

  return Math.hypot(dx, dy) <= hitRadiusPx;
}

export function computeSplitRatioFromClient(
  canvas: HTMLCanvasElement | null,
  clientX: number,
  clientY: number,
  splitDirection: SplitDirection,
  getImageCoordsFromClient: (clientX: number, clientY: number) => {x: number; y: number},
): number | null {
  if (!canvas) return null;

  const coords = getImageCoordsFromClient(clientX, clientY);
  return getSplitRatioFromPoint(coords.x, coords.y, canvas.width, canvas.height, splitDirection);
}
