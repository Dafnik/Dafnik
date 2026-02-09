import {useMemo} from 'react';
import {
  computeBlurStrokeOutlineRects,
  getResizeHandlePoints,
  type BlurBoxRect,
} from '@/features/editor/lib/blur-box-geometry';
import type {BlurStroke} from '@/features/editor/state/types';

interface BlurOutlineOverlayProps {
  visible: boolean;
  strokes: BlurStroke[];
  canvasWidth: number;
  canvasHeight: number;
  selectedStrokeIndices?: number[];
  marqueeRect?: BlurBoxRect | null;
  showResizeHandles?: boolean;
  scale?: number;
  forceDashedStyle?: boolean;
}

interface OverlayHandlePoint {
  key: string;
  handle: string;
  x: number;
  y: number;
}

export function BlurOutlineOverlay({
  visible,
  strokes,
  canvasWidth,
  canvasHeight,
  selectedStrokeIndices = [],
  marqueeRect = null,
  showResizeHandles = false,
  scale = 1,
  forceDashedStyle = false,
}: BlurOutlineOverlayProps) {
  const rects = useMemo(
    () => computeBlurStrokeOutlineRects(strokes, canvasWidth, canvasHeight),
    [canvasHeight, canvasWidth, strokes],
  );

  const selectedSet = useMemo(() => new Set(selectedStrokeIndices), [selectedStrokeIndices]);

  const singleSelectedRect =
    selectedStrokeIndices.length === 1 ? (rects[selectedStrokeIndices[0]] ?? null) : null;
  const handlePoints = useMemo<OverlayHandlePoint[]>(() => {
    if (!showResizeHandles || !singleSelectedRect) return [];
    return getResizeHandlePoints(singleSelectedRect).map((handlePoint) => ({
      key: `single-${handlePoint.handle}`,
      handle: handlePoint.handle,
      x: handlePoint.x,
      y: handlePoint.y,
    }));
  }, [showResizeHandles, singleSelectedRect]);

  if (!visible) return null;

  const visibleRects = rects.filter((rect): rect is BlurBoxRect => rect !== null);
  if (visibleRects.length === 0 && !marqueeRect) return null;

  const handleSize = Math.max(6, Math.min(12, 10 / Math.max(scale, 0.1)));

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
      preserveAspectRatio="none">
      {rects.map((rect, index) => {
        if (!rect) return null;

        const selected = selectedSet.has(index) || forceDashedStyle;
        return (
          <rect
            key={`${rect.x}-${rect.y}-${rect.width}-${rect.height}-${index}`}
            data-testid={selected ? 'blur-outline-selected' : 'blur-outline'}
            x={rect.x}
            y={rect.y}
            width={rect.width}
            height={rect.height}
            fill="none"
            stroke={selected ? '#22c55e' : '#ef4444'}
            strokeWidth={selected ? 2.5 : 2}
            strokeDasharray={selected ? '5 3' : undefined}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}

      {handlePoints.map((handlePoint) => (
        <rect
          key={`handle-${handlePoint.key}`}
          data-testid="blur-outline-handle"
          x={handlePoint.x - handleSize / 2}
          y={handlePoint.y - handleSize / 2}
          width={handleSize}
          height={handleSize}
          fill="#ffffff"
          stroke="#16a34a"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {marqueeRect ? (
        <rect
          data-testid="blur-outline-marquee"
          x={marqueeRect.x}
          y={marqueeRect.y}
          width={marqueeRect.width}
          height={marqueeRect.height}
          fill="rgba(34, 197, 94, 0.15)"
          stroke="#22c55e"
          strokeWidth={1.5}
          strokeDasharray="6 4"
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
    </svg>
  );
}
