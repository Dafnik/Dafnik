interface BrushCursorProps {
  cursorPos: {x: number; y: number} | null;
  isPanning: boolean;
  isBlurTool: boolean;
  isAreaMode: boolean;
  brushRadius: number;
  scale: number;
}

export function BrushCursor({
  cursorPos,
  isPanning,
  isBlurTool,
  isAreaMode,
  brushRadius,
  scale,
}: BrushCursorProps) {
  if (!cursorPos || isPanning || !isBlurTool || isAreaMode) return null;

  return (
    <div
      data-testid="brush-radius-preview"
      className="pointer-events-none absolute rounded-full border-2 border-white/60"
      style={{
        width: brushRadius * 2 * scale,
        height: brushRadius * 2 * scale,
        left: cursorPos.x * scale - brushRadius * scale,
        top: cursorPos.y * scale - brushRadius * scale,
        boxShadow: '0 0 0 1px rgba(0,0,0,0.3)',
      }}
    />
  );
}
