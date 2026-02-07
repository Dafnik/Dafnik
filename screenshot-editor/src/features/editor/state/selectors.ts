import type {EditorStoreState} from './types';

export const selectCanvasSize = (state: EditorStoreState) => ({
  width: state.imageWidth || 800,
  height: state.imageHeight || 600,
});

export const selectActiveImages = (state: EditorStoreState) => ({
  image1: state.image1,
  image2: state.image2,
});

export const selectCanUndo = (state: EditorStoreState) => state.canUndo;
export const selectCanRedo = (state: EditorStoreState) => state.canRedo;

export const selectDrawingState = (state: EditorStoreState) => ({
  isDrawing: state.isDrawing,
  currentStroke: state.currentStroke,
});
