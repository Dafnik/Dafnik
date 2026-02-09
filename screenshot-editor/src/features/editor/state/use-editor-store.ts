import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import {applyHistorySnapshot, createHistorySnapshot, withHistoryMeta} from './history';
import {
  denormalizeTemplateToStrokes,
  loadBlurTemplates,
  normalizeStrokesForTemplate,
  saveBlurTemplates,
} from './blur-templates-storage';
import {
  getPersistedSettingsSlice,
  loadLegacySettingsOnce,
  SETTINGS_STORAGE_KEY,
} from './persistence';
import type {ActionResult, EditorStoreState, HistorySnapshot, LightImageSide} from './types';
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
const initialBlurTemplates = loadBlurTemplates();

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
  showShortcutsModal: false,
  showLightSelectorModal: false,
  selectorFirstImage: null,
  selectorSecondImage: null,
  lightSelectorState: 'idle' as const,
  showTemplatePanel: false,
  selectedTemplateId: null,
  blurTemplates: initialBlurTemplates,
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
          showShortcutsModal: false,
          showLightSelectorModal: false,
          selectorFirstImage: null,
          selectorSecondImage: null,
          lightSelectorState: 'idle',
          showTemplatePanel: false,
          selectedTemplateId: null,
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
          showShortcutsModal: false,
          showLightSelectorModal: false,
          selectorFirstImage: null,
          selectorSecondImage: null,
          lightSelectorState: 'idle',
          showTemplatePanel: false,
          selectedTemplateId: null,
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
      clearBlurStrokes: () => {
        const state = get();
        if (state.blurStrokes.length === 0 && !state.currentStroke) return;

        set({
          blurStrokes: [],
          isDrawing: false,
          currentStroke: null,
        });
        get().pushHistorySnapshot();
      },

      setShowBlurOutlines: (showBlurOutlines) => set({showBlurOutlines}),
      toggleTemplatePanel: () =>
        set((state) => {
          const showTemplatePanel = !state.showTemplatePanel;
          return {
            showTemplatePanel,
            showBlurOutlines: showTemplatePanel,
          };
        }),
      setTemplatePanelOpen: (showTemplatePanel) =>
        set({
          showTemplatePanel,
          showBlurOutlines: showTemplatePanel,
        }),
      setSelectedTemplate: (selectedTemplateId) => set({selectedTemplateId}),

      createBlurTemplate: (name) => {
        const state = get();
        const normalizedName = normalizeTemplateName(name);
        if (!normalizedName) {
          return {ok: false, error: 'Template name is required.'} satisfies ActionResult;
        }
        if (state.blurStrokes.length === 0) {
          return {
            ok: false,
            error: 'Create at least one blur stroke before saving a template.',
          } satisfies ActionResult;
        }
        if (!state.imageWidth || !state.imageHeight) {
          return {ok: false, error: 'Image size is not ready yet.'} satisfies ActionResult;
        }

        const nameKey = normalizedName.toLowerCase();
        const exists = state.blurTemplates.some(
          (template) => template.name.trim().toLowerCase() === nameKey,
        );
        if (exists) {
          return {ok: false, error: 'Template name must be unique.'} satisfies ActionResult;
        }

        const now = new Date().toISOString();
        const template = {
          id: createTemplateId(),
          name: normalizedName,
          sourceWidth: state.imageWidth,
          sourceHeight: state.imageHeight,
          strokes: normalizeStrokesForTemplate(
            state.blurStrokes,
            state.imageWidth,
            state.imageHeight,
          ),
          createdAt: now,
          updatedAt: now,
        };

        const blurTemplates = [...state.blurTemplates, template];
        saveBlurTemplates(blurTemplates);
        set({blurTemplates, selectedTemplateId: template.id});

        return {ok: true} satisfies ActionResult;
      },

      updateBlurTemplate: (templateId, name) => {
        const state = get();
        const normalizedName = normalizeTemplateName(name);
        if (!normalizedName) {
          return {ok: false, error: 'Template name is required.'} satisfies ActionResult;
        }
        if (state.blurStrokes.length === 0) {
          return {
            ok: false,
            error: 'Create at least one blur stroke before updating a template.',
          } satisfies ActionResult;
        }
        if (!state.imageWidth || !state.imageHeight) {
          return {ok: false, error: 'Image size is not ready yet.'} satisfies ActionResult;
        }

        const target = state.blurTemplates.find((template) => template.id === templateId);
        if (!target) {
          return {ok: false, error: 'Selected template was not found.'} satisfies ActionResult;
        }

        const normalizedKey = normalizedName.toLowerCase();
        const duplicate = state.blurTemplates.some(
          (template) =>
            template.id !== templateId && template.name.trim().toLowerCase() === normalizedKey,
        );
        if (duplicate) {
          return {ok: false, error: 'Template name must be unique.'} satisfies ActionResult;
        }

        const updatedAt = new Date().toISOString();
        const blurTemplates = state.blurTemplates.map((template) => {
          if (template.id !== templateId) return template;
          return {
            ...template,
            name: normalizedName,
            sourceWidth: state.imageWidth,
            sourceHeight: state.imageHeight,
            strokes: normalizeStrokesForTemplate(
              state.blurStrokes,
              state.imageWidth,
              state.imageHeight,
            ),
            updatedAt,
          };
        });

        saveBlurTemplates(blurTemplates);
        set({blurTemplates, selectedTemplateId: templateId});

        return {ok: true} satisfies ActionResult;
      },

      reorderBlurTemplates: (fromIndex, toIndex) => {
        const state = get();
        const {blurTemplates} = state;

        if (
          !Number.isInteger(fromIndex) ||
          !Number.isInteger(toIndex) ||
          fromIndex < 0 ||
          toIndex < 0 ||
          fromIndex >= blurTemplates.length ||
          toIndex >= blurTemplates.length
        ) {
          return {ok: false, error: 'Template order index is invalid.'} satisfies ActionResult;
        }

        if (fromIndex === toIndex) {
          return {ok: true} satisfies ActionResult;
        }

        const reorderedTemplates = [...blurTemplates];
        const [movedTemplate] = reorderedTemplates.splice(fromIndex, 1);
        reorderedTemplates.splice(toIndex, 0, movedTemplate);

        saveBlurTemplates(reorderedTemplates);
        set({blurTemplates: reorderedTemplates});

        return {ok: true} satisfies ActionResult;
      },

      deleteBlurTemplate: (templateId) => {
        const state = get();
        const exists = state.blurTemplates.some((template) => template.id === templateId);
        if (!exists) {
          return {ok: false, error: 'Selected template was not found.'} satisfies ActionResult;
        }

        const blurTemplates = state.blurTemplates.filter((template) => template.id !== templateId);
        saveBlurTemplates(blurTemplates);
        set({
          blurTemplates,
          selectedTemplateId:
            state.selectedTemplateId === templateId ? null : state.selectedTemplateId,
        });

        return {ok: true} satisfies ActionResult;
      },

      loadBlurTemplate: (templateId) => {
        const state = get();
        const template = state.blurTemplates.find((item) => item.id === templateId);
        if (!template) {
          return {ok: false, error: 'Selected template was not found.'} satisfies ActionResult;
        }

        const targetWidth = state.imageWidth || template.sourceWidth;
        const targetHeight = state.imageHeight || template.sourceHeight;
        const blurStrokes = denormalizeTemplateToStrokes(
          template.strokes,
          targetWidth,
          targetHeight,
        );

        set({
          blurStrokes: [...state.blurStrokes, ...blurStrokes],
          isDrawing: false,
          currentStroke: null,
          selectedTemplateId: templateId,
        });
        get().pushHistorySnapshot();

        return {ok: true} satisfies ActionResult;
      },

      openExportModal: () => set({showExportModal: true}),
      closeExportModal: () => set({showExportModal: false}),
      openShortcutsModal: () => set({showShortcutsModal: true}),
      closeShortcutsModal: () => set({showShortcutsModal: false}),
      toggleShortcutsModal: () => set((state) => ({showShortcutsModal: !state.showShortcutsModal})),

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

function normalizeTemplateName(name: string): string {
  return name.trim();
}

function createTemplateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `tmpl_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export const useEditorStoreApi = () => useEditorStore;
