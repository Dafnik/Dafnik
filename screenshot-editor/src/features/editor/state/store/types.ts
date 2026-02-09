import type {EditorStoreState} from '@/features/editor/state/types';

export type StoreSet = (
  partial:
    | Partial<EditorStoreState>
    | EditorStoreState
    | ((
        state: EditorStoreState,
      ) => Partial<EditorStoreState> | EditorStoreState | Record<string, never>),
) => void;

export type StoreGet = () => EditorStoreState;

export interface StoreContext {
  set: StoreSet;
  get: StoreGet;
}
