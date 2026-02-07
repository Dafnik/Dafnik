import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {applyHistorySnapshot, createHistorySnapshot, withHistoryMeta} from './history';
import {
  getPersistedSettingsSlice,
  loadLegacySettingsOnce,
  SETTINGS_STORAGE_KEY,
} from './persistence';
import type {EditorStoreState, HistorySnapshot, LightImageSide} from './types';
import {DEFAULT_SETTINGS} from './types';

let splitRatioDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function clearSplitRatioTimer() {
  if (splitRatioDebounceTimer) {
    clearTimeout(splitRatioDebounceTimer);
    splitRatioDebounceTimer = null;
  }
}

const migratedLegacySettings = loadLegacySettingsOnce();
const initialSettings = {
  ...DEFAULT_SETTINGS,
  ...migratedLegacySettings,
};

const baseState = {
  image1: null,
  image2: null,
  imageWidth: 0,
  imageHeight: 0,
  splitRatio: initialSettings.splitRatio,
  splitDirection: initialSettings.splitDirection,
  blurStrokes: [],
  activeTool: initialSettings.activeTool,
  blurType: initialSettings.blurType,
  brushRadius: initialSettings.brushRadius,
  brushStrength: initialSettings.brushStrength,
  lightImageSide: initialSettings.lightImageSide,
  showBlurOutlines: false,
  zoom: initialSettings.zoom,
  panX: 0,
  panY: 0,
  isDrawing: false,
  currentStroke: null,
  isEditing: false,
  showExportModal: false,
  showLightSelectorModal: false,
  selectorFirstImage: null,
  selectorSecondImage: null,
  lightSelectorState: 'idle' as const,
  history: [] as HistorySnapshot[],
  historyIndex: -1,
  canUndo: false,
  canRedo: false,
};

export const useEditorStore = create<EditorStoreState>()(
  persist(
    (set, get) => ({
      ...baseState,

      initializeEditor: ({image1, image2, width, height}) => {
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
          showLightSelectorModal: false,
          selectorFirstImage: null,
          selectorSecondImage: null,
          lightSelectorState: 'idle',
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
          showLightSelectorModal: false,
          selectorFirstImage: null,
          selectorSecondImage: null,
          lightSelectorState: 'idle',
          showBlurOutlines: false,
          panX: 0,
          panY: 0,
          ...withHistoryMeta([], -1),
        }));
      },

      resetSettingsToDefaults: () => {
        set(() => ({
          splitRatio: DEFAULT_SETTINGS.splitRatio,
          splitDirection: DEFAULT_SETTINGS.splitDirection,
          brushRadius: DEFAULT_SETTINGS.brushRadius,
          brushStrength: DEFAULT_SETTINGS.brushStrength,
          blurType: DEFAULT_SETTINGS.blurType,
          activeTool: DEFAULT_SETTINGS.activeTool,
          lightImageSide: DEFAULT_SETTINGS.lightImageSide,
          zoom: DEFAULT_SETTINGS.zoom,
          showBlurOutlines: false,
        }));
      },

      setActiveTool: (activeTool) => set({activeTool}),
      setBrushRadius: (brushRadius) => set({brushRadius}),
      setBrushStrength: (brushStrength) => set({brushStrength}),
      setBlurType: (blurType) => set({blurType}),

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

      setZoom: (value) => set({zoom: Math.max(10, Math.min(500, value))}),
      setPan: (panX, panY) => set({panX, panY}),

      startStroke: (x, y) => {
        const state = get();
        if (state.activeTool !== 'blur') return;

        set({
          isDrawing: true,
          currentStroke: {
            points: [{x, y}],
            radius: state.brushRadius,
            strength: state.brushStrength,
            blurType: state.blurType,
          },
        });
      },

      appendStrokePoint: (x, y) => {
        set((state) => {
          if (!state.isDrawing || !state.currentStroke) return {};
          return {
            currentStroke: {
              ...state.currentStroke,
              points: [...state.currentStroke.points, {x, y}],
            },
          };
        });
      },

      finishStroke: () => {
        const state = get();
        if (!state.currentStroke || state.currentStroke.points.length === 0) {
          set({isDrawing: false, currentStroke: null});
          return;
        }

        set((prev) => ({
          blurStrokes: [...prev.blurStrokes, prev.currentStroke!],
          isDrawing: false,
          currentStroke: null,
        }));
        get().pushHistorySnapshot();
      },

      cancelStroke: () => set({isDrawing: false, currentStroke: null}),

      setShowBlurOutlines: (showBlurOutlines) => set({showBlurOutlines}),

      openExportModal: () => set({showExportModal: true}),
      closeExportModal: () => set({showExportModal: false}),

      openLightSelector: ({firstImage, secondImage}) =>
        set({
          showLightSelectorModal: true,
          selectorFirstImage: firstImage,
          selectorSecondImage: secondImage,
          lightSelectorState: 'awaitingSelection',
        }),

      resolveLightSelector: (selection) =>
        set({
          showLightSelectorModal: false,
          selectorFirstImage: null,
          selectorSecondImage: null,
          lightSelectorState: selection === 'cancel' ? 'cancelled' : 'resolved',
        }),

      addSecondImage: (image) => {
        set({image2: image});
        get().pushHistorySnapshot();
      },

      removeSecondImage: () => {
        set({image2: null});
        get().pushHistorySnapshot();
      },

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
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      version: 1,
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

function orderBySidePreference(lightImage: string, darkImage: string, side: LightImageSide) {
  if (side === 'left') {
    return {image1: lightImage, image2: darkImage};
  }
  return {image1: darkImage, image2: lightImage};
}

export const useEditorStoreApi = () => useEditorStore;
