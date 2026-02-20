import {
  hitTestResizeHandle,
  isPointInRect,
  type BlurBoxRect,
  type ResizeHandle,
} from '@/features/editor/lib/blur-box-geometry';

export function areIndexListsEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function findTopmostRectIndexAtPoint(
  point: {x: number; y: number},
  rects: Array<BlurBoxRect | null>,
  restrictTo?: Set<number>,
): number | null {
  for (let index = rects.length - 1; index >= 0; index -= 1) {
    if (restrictTo && !restrictTo.has(index)) continue;
    const rect = rects[index];
    if (!rect) continue;
    if (isPointInRect(point, rect)) return index;
  }
  return null;
}

export function findTopmostResizeHandleAtPoint(
  point: {x: number; y: number},
  rects: Array<BlurBoxRect | null>,
  handleHitSize: number,
  restrictTo?: Set<number>,
): {index: number; handle: ResizeHandle} | null {
  for (let index = rects.length - 1; index >= 0; index -= 1) {
    if (restrictTo && !restrictTo.has(index)) continue;
    const rect = rects[index];
    if (!rect) continue;

    const handle = hitTestResizeHandle(point, rect, handleHitSize);
    if (handle) {
      return {index, handle};
    }
  }

  return null;
}
