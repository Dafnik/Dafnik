// Editor state management with undo/redo support
export type SplitDirection = 'horizontal' | 'vertical' | 'diagonal-tl-br' | 'diagonal-tr-bl';
export type BlurType = 'normal' | 'pixelated';
export type ActiveTool = 'select' | 'blur';
export type LightImageSide = 'left' | 'right';

export interface BlurStroke {
  points: {x: number; y: number}[];
  radius: number;
  strength: number;
  blurType: BlurType;
}

export interface EditorState {
  image1: string | null;
  image2: string | null;
  splitRatio: number;
  splitDirection: SplitDirection;
  blurStrokes: BlurStroke[];
  brushRadius: number;
  brushStrength: number;
  blurType: BlurType;
  activeTool: ActiveTool;
  zoom: number;
  panX: number;
  panY: number;
  imageWidth: number;
  imageHeight: number;
}

export interface HistoryEntry {
  image1: string | null;
  image2: string | null;
  splitRatio: number;
  splitDirection: SplitDirection;
  blurStrokes: BlurStroke[];
}

export function getHistoryEntry(state: EditorState): HistoryEntry {
  return {
    image1: state.image1,
    image2: state.image2,
    splitRatio: state.splitRatio,
    splitDirection: state.splitDirection,
    blurStrokes: state.blurStrokes.map((s) => ({...s, points: [...s.points]})),
  };
}

export function applyHistoryEntry(state: EditorState, entry: HistoryEntry): EditorState {
  return {
    ...state,
    image1: entry.image1,
    image2: entry.image2,
    splitRatio: entry.splitRatio,
    splitDirection: entry.splitDirection,
    blurStrokes: entry.blurStrokes.map((s) => ({...s, points: [...s.points]})),
  };
}

export const initialEditorState: EditorState = {
  image1: null,
  image2: null,
  splitRatio: 50,
  splitDirection: 'vertical',
  blurStrokes: [],
  brushRadius: 20,
  brushStrength: 10,
  blurType: 'normal',
  activeTool: 'select',
  zoom: 100,
  panX: 0,
  panY: 0,
  imageWidth: 0,
  imageHeight: 0,
};
