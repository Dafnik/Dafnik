import type {Point} from '@/features/editor/state/types';
import type {BlurBoxRect} from './outline';

export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

export interface ResizeHandlePoint {
  handle: ResizeHandle;
  x: number;
  y: number;
}

const HANDLE_ORDER: ResizeHandle[] = ['nw', 'ne', 'sw', 'se', 'n', 'e', 's', 'w'];

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
