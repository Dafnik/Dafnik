import {useMemo} from 'react';
import type {BlurStroke} from '@/features/editor/state/types';

interface BlurOutlineOverlayProps {
  visible: boolean;
  strokes: BlurStroke[];
  canvasWidth: number;
  canvasHeight: number;
}

export function BlurOutlineOverlay({
  visible,
  strokes,
  canvasWidth,
  canvasHeight,
}: BlurOutlineOverlayProps) {
  const rects = useMemo(() => {
    return strokes.flatMap((stroke) => {
      if (stroke.points.length === 0) return [];

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

      if (width <= 0 || height <= 0) return [];
      return [{x, y, width, height}];
    });
  }, [canvasHeight, canvasWidth, strokes]);

  if (!visible || rects.length === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
      preserveAspectRatio="none">
      {rects.map((rect, index) => (
        <rect
          key={`${rect.x}-${rect.y}-${rect.width}-${rect.height}-${index}`}
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          fill="none"
          stroke="#ef4444"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
