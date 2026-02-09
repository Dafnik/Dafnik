import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {SETTINGS_STORAGE_KEY, getPersistedSettingsSlice} from './persistence';
import {createDocumentActions} from './store/actions/document-actions';
import {createHistoryActions} from './store/actions/history-actions';
import {createStrokeActions} from './store/actions/stroke-actions';
import {createTemplateActions} from './store/actions/template-actions';
import {createUiActions} from './store/actions/ui-actions';
import {createBaseState} from './store/base-state';
import type {StoreGet, StoreSet} from './store/types';
import type {EditorStoreState} from './types';

const baseState = createBaseState();

export const useEditorStore = create<EditorStoreState>()(
  persist(
    (set, get) => {
      const context = {
        set: set as unknown as StoreSet,
        get: get as unknown as StoreGet,
      };

      return {
        ...baseState,
        ...createDocumentActions(context),
        ...createStrokeActions(context),
        ...createTemplateActions(context),
        ...createUiActions(context),
        ...createHistoryActions(context),
      };
    },
    {
      name: SETTINGS_STORAGE_KEY,
      version: 2,
      migrate: (persistedState, version) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return persistedState;
        }

        if (version < 2) {
          const typedState = persistedState as Partial<EditorStoreState>;
          if (typedState.activeTool === 'select') {
            return {
              ...typedState,
              activeTool: 'drag',
            };
          }
        }

        return persistedState;
      },
      partialize: (state) =>
        getPersistedSettingsSlice({
          splitRatio: state.splitRatio,
          splitDirection: state.splitDirection,
          brushRadius: state.brushRadius,
          brushStrength: state.brushStrength,
          blurType: state.blurType,
          activeTool: state.activeTool,
          lightImageSide: state.lightImageSide,
          zoom: state.zoom,
        }),
    },
  ),
);

export const useEditorStoreApi = () => useEditorStore;
