import type {BlurStroke, EditorStoreState, HistorySnapshot} from './types';

function cloneStroke(stroke: BlurStroke): BlurStroke {
  return {
    ...stroke,
    points: stroke.points.map((point) => ({...point})),
  };
}

export function cloneStrokes(strokes: BlurStroke[]): BlurStroke[] {
  return strokes.map(cloneStroke);
}

export function createHistorySnapshot(
  state: Pick<
    EditorStoreState,
    'image1' | 'image2' | 'splitRatio' | 'splitDirection' | 'blurStrokes'
  >,
): HistorySnapshot {
  return {
    image1: state.image1,
    image2: state.image2,
    splitRatio: state.splitRatio,
    splitDirection: state.splitDirection,
    blurStrokes: cloneStrokes(state.blurStrokes),
  };
}

export function applyHistorySnapshot(
  snapshot: HistorySnapshot,
): Pick<EditorStoreState, 'image1' | 'image2' | 'splitRatio' | 'splitDirection' | 'blurStrokes'> {
  return {
    image1: snapshot.image1,
    image2: snapshot.image2,
    splitRatio: snapshot.splitRatio,
    splitDirection: snapshot.splitDirection,
    blurStrokes: cloneStrokes(snapshot.blurStrokes),
  };
}

export function withHistoryMeta(history: HistorySnapshot[], historyIndex: number) {
  return {
    history,
    historyIndex,
    canUndo: historyIndex > 0,
    canRedo: historyIndex >= 0 && historyIndex < history.length - 1,
  };
}
