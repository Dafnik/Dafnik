import type {EditorStoreState, HistorySnapshot} from './types';

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
    // Keep structural sharing for committed strokes to avoid deep-copy amplification.
    blurStrokes: state.blurStrokes,
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
    blurStrokes: snapshot.blurStrokes as EditorStoreState['blurStrokes'],
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
