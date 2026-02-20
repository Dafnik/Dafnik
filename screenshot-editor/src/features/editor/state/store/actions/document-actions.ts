import {withHistoryMeta} from '@/features/editor/state/history';
import {RESET_AUTO_BLUR_SETTINGS_EVENT} from '@/features/editor/lib/events';
import {saveAutoBlurDefaults} from '@/features/editor/state/auto-blur-defaults-storage';
import {saveAutoBlurCustomTexts} from '@/features/editor/state/auto-blur-custom-text-storage';
import {saveSkipResetProjectConfirmation} from '@/features/editor/state/reset-project-confirmation-storage';
import {orderBySidePreference} from '@/features/editor/state/store/helpers';
import type {EditorStoreActions} from '@/features/editor/state/types';
import {DEFAULT_SETTINGS} from '@/features/editor/state/types';
import type {StoreContext} from '@/features/editor/state/store/types';

let splitRatioDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function clearSplitRatioTimer() {
  if (splitRatioDebounceTimer) {
    clearTimeout(splitRatioDebounceTimer);
    splitRatioDebounceTimer = null;
  }
}

export function createDocumentActions({
  set,
  get,
}: StoreContext): Pick<
  EditorStoreActions,
  | 'initializeEditor'
  | 'resetProject'
  | 'resetSettingsToDefaults'
  | 'setSplitDirection'
  | 'setSplitRatio'
  | 'setLightImageSide'
  | 'addSecondImage'
  | 'removeSecondImage'
> {
  return {
    initializeEditor: ({image1, image2, width, height, exportBaseName}) => {
      clearSplitRatioTimer();
      set((state) => ({
        image1,
        image2,
        imageWidth: width,
        imageHeight: height,
        splitRatio: image2 ? state.splitRatio : DEFAULT_SETTINGS.splitRatio,
        splitDirection: image2 ? state.splitDirection : DEFAULT_SETTINGS.splitDirection,
        blurStrokes: [],
        isDrawing: false,
        currentStroke: null,
        isEditing: true,
        panX: 0,
        panY: 0,
        showExportModal: false,
        showResetProjectModal: false,
        exportBaseName: exportBaseName ?? null,
        showShortcutsModal: false,
        showLightSelectorModal: false,
        selectorFirstImage: null,
        selectorSecondImage: null,
        lightSelectorState: 'idle',
        showSplitViewSidebar: Boolean(image2),
        selectedTemplateId: null,
        selectedStrokeIndices: [],
        isShiftPressed: false,
        ...withHistoryMeta([], -1),
      }));
      get().pushHistorySnapshot();
    },

    resetProject: () => {
      clearSplitRatioTimer();
      set(() => ({
        image1: null,
        image2: null,
        imageWidth: 0,
        imageHeight: 0,
        blurStrokes: [],
        isDrawing: false,
        currentStroke: null,
        isEditing: false,
        showExportModal: false,
        showResetProjectModal: false,
        exportBaseName: null,
        showShortcutsModal: false,
        showLightSelectorModal: false,
        selectorFirstImage: null,
        selectorSecondImage: null,
        lightSelectorState: 'idle',
        showSplitViewSidebar: false,
        selectedTemplateId: null,
        selectedStrokeIndices: [],
        showBlurOutlines: false,
        isShiftPressed: false,
        panX: 0,
        panY: 0,
        ...withHistoryMeta([], -1),
      }));
    },

    resetSettingsToDefaults: () => {
      saveAutoBlurDefaults({email: false, phone: false, customEntries: []});
      saveAutoBlurCustomTexts([]);
      saveSkipResetProjectConfirmation(false);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(RESET_AUTO_BLUR_SETTINGS_EVENT));
      }

      set(() => ({
        splitRatio: DEFAULT_SETTINGS.splitRatio,
        splitDirection: DEFAULT_SETTINGS.splitDirection,
        brushRadius: DEFAULT_SETTINGS.brushRadius,
        brushStrength: DEFAULT_SETTINGS.brushStrength,
        blurType: DEFAULT_SETTINGS.blurType,
        blurStrokeShape: DEFAULT_SETTINGS.blurStrokeShape,
        activeTool: DEFAULT_SETTINGS.activeTool,
        isShiftPressed: false,
        lightImageSide: DEFAULT_SETTINGS.lightImageSide,
        zoom: DEFAULT_SETTINGS.zoom,
        showBlurOutlines: false,
      }));
    },

    setSplitDirection: (splitDirection, options) => {
      set({splitDirection});
      if (options?.commitHistory ?? true) {
        get().pushHistorySnapshot();
      }
    },

    setSplitRatio: (value, options) => {
      const splitRatio = Math.max(10, Math.min(90, value));
      set({splitRatio});

      if (!(options?.debouncedHistory ?? true)) return;

      clearSplitRatioTimer();
      splitRatioDebounceTimer = setTimeout(() => {
        get().pushHistorySnapshot();
        splitRatioDebounceTimer = null;
      }, 400);
    },

    setLightImageSide: (nextSide, options) => {
      const state = get();
      if (state.lightImageSide === nextSide) return;

      set({lightImageSide: nextSide});

      if (!(options?.reorderImages ?? true)) return;
      if (!state.image1 || !state.image2) return;

      const currentLight = state.lightImageSide === 'left' ? state.image1 : state.image2;
      const currentDark = state.lightImageSide === 'left' ? state.image2 : state.image1;

      const ordered = orderBySidePreference(currentLight, currentDark, nextSide);
      set({image1: ordered.image1, image2: ordered.image2});
      get().pushHistorySnapshot();
    },

    addSecondImage: (image) => {
      set({image2: image, showSplitViewSidebar: true});
      get().pushHistorySnapshot();
    },

    removeSecondImage: () => {
      set({image2: null});
      get().pushHistorySnapshot();
    },
  };
}
