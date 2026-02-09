import {
  denormalizeTemplateToStrokes,
  normalizeStrokesForTemplate,
  saveBlurTemplates,
} from '@/features/editor/state/blur-templates-storage';
import {createTemplateId, normalizeTemplateName} from '@/features/editor/state/store/helpers';
import type {ActionResult, EditorStoreActions} from '@/features/editor/state/types';
import type {StoreContext} from '@/features/editor/state/store/types';

export function createTemplateActions({
  set,
  get,
}: StoreContext): Pick<
  EditorStoreActions,
  | 'toggleTemplatePanel'
  | 'setTemplatePanelOpen'
  | 'setSelectedTemplate'
  | 'createBlurTemplate'
  | 'updateBlurTemplate'
  | 'reorderBlurTemplates'
  | 'deleteBlurTemplate'
  | 'loadBlurTemplate'
> {
  return {
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
      const blurStrokes = denormalizeTemplateToStrokes(template.strokes, targetWidth, targetHeight);

      set({
        blurStrokes: [...state.blurStrokes, ...blurStrokes],
        isDrawing: false,
        currentStroke: null,
        selectedTemplateId: templateId,
      });
      get().pushHistorySnapshot();

      return {ok: true} satisfies ActionResult;
    },
  };
}
