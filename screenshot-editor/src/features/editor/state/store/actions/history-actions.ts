import {
  applyHistorySnapshot,
  createHistorySnapshot,
  withHistoryMeta,
} from '@/features/editor/state/history';
import type {EditorStoreActions} from '@/features/editor/state/types';
import type {StoreContext} from '@/features/editor/state/store/types';

export function createHistoryActions({
  set,
}: StoreContext): Pick<EditorStoreActions, 'pushHistorySnapshot' | 'undo' | 'redo'> {
  return {
    pushHistorySnapshot: () => {
      set((state) => {
        const snapshot = createHistorySnapshot(state);
        const history = state.history.slice(0, state.historyIndex + 1);
        history.push(snapshot);
        return withHistoryMeta(history, history.length - 1);
      });
    },

    undo: () => {
      set((state) => {
        if (state.historyIndex <= 0) return {};
        const nextIndex = state.historyIndex - 1;
        const snapshot = state.history[nextIndex];
        if (!snapshot) return {};

        return {
          ...applyHistorySnapshot(snapshot),
          isDrawing: false,
          currentStroke: null,
          ...withHistoryMeta(state.history, nextIndex),
        };
      });
    },

    redo: () => {
      set((state) => {
        if (state.historyIndex >= state.history.length - 1) return {};
        const nextIndex = state.historyIndex + 1;
        const snapshot = state.history[nextIndex];
        if (!snapshot) return {};

        return {
          ...applyHistorySnapshot(snapshot),
          isDrawing: false,
          currentStroke: null,
          ...withHistoryMeta(state.history, nextIndex),
        };
      });
    },
  };
}
