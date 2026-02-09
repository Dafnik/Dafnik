import type {MutableRefObject} from 'react';

export function getReusableCanvas(
  canvasRef: MutableRefObject<HTMLCanvasElement | null>,
  width: number,
  height: number,
): HTMLCanvasElement {
  if (!canvasRef.current) {
    canvasRef.current = document.createElement('canvas');
  }

  const canvas = canvasRef.current;
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  return canvas;
}
