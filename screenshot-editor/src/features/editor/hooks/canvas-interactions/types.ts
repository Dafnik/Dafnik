import type {PointerEvent as ReactPointerEvent, RefObject} from 'react';
import type {BlurBoxRect, ResizeHandle} from '@/features/editor/lib/blur-box-geometry';
import type {ActiveTool, BlurStroke, Point} from '@/features/editor/state/types';

export interface UseCanvasInteractionsOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
}

export interface SamplingPerfStats {
  acceptedPoints: number;
  skippedPoints: number;
}

export type SelectInteractionMode = 'idle' | 'marquee' | 'move' | 'resize';

export interface SelectTransformSession {
  mode: 'move' | 'resize';
  pointerStart: Point;
  initialStrokes: BlurStroke[];
  selectedIndices: number[];
  selectionUnionRect: BlurBoxRect | null;
  singleBaseRect: BlurBoxRect | null;
  baseAspectRatio: number | null;
  resizeHandle: ResizeHandle | null;
  changed: boolean;
}

export interface SelectionHookOptions {
  activeTool: ActiveTool;
  blurStrokes: BlurStroke[];
  canvasRef: RefObject<HTMLCanvasElement | null>;
  getImageCoordsFromClient: (clientX: number, clientY: number) => Point;
  getResizeHandleHitSizeInCanvasSpace: () => number;
  isWithinCanvasBounds: (clientX: number, clientY: number) => boolean;
}

export interface SelectionHookResult {
  selectCursor: string;
  selectedStrokeIndices: number[];
  marqueeRect: BlurBoxRect | null;
  handleSelectPointerDown: (event: ReactPointerEvent<HTMLDivElement>, coords: Point) => void;
  handleSelectPointerMove: (event: ReactPointerEvent<HTMLDivElement>, coords: Point) => void;
  handleSelectPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  handleSelectPointerLeave: () => void;
  handleSelectPointerCancel: () => void;
}
