import {describe, expect, it} from 'vitest';
import {BLUR_TEMPLATES_STORAGE_KEY} from '@/features/editor/state/blur-templates-storage';
import type {BlurTemplate} from '@/features/editor/state/types';
import {useEditorStore} from '@/features/editor/state/use-editor-store';

function makeTemplate(id: string, name: string): BlurTemplate {
  return {
    id,
    name,
    sourceWidth: 100,
    sourceHeight: 100,
    strokes: [
      {
        points: [{xRatio: 0.2, yRatio: 0.2}],
        radiusRatio: 0.1,
        strength: 8,
        blurType: 'normal',
      },
    ],
    createdAt: '2026-02-07T00:00:00.000Z',
    updatedAt: '2026-02-07T00:00:00.000Z',
  };
}

describe('store template actions', () => {
  it('creates template and rejects duplicate name', () => {
    const store = useEditorStore;
    store.setState({
      imageWidth: 200,
      imageHeight: 100,
      blurStrokes: [
        {
          points: [{x: 10, y: 20}],
          radius: 12,
          strength: 8,
          blurType: 'normal',
        },
      ],
    });

    const created = store.getState().createBlurTemplate('Faces');
    expect(created.ok).toBe(true);
    expect(store.getState().blurTemplates).toHaveLength(1);

    const duplicate = store.getState().createBlurTemplate(' faces ');
    expect(duplicate.ok).toBe(false);
    expect(duplicate.error).toContain('unique');
  });

  it('updates and deletes template', () => {
    const store = useEditorStore;
    store.setState({
      imageWidth: 200,
      imageHeight: 100,
      blurStrokes: [
        {
          points: [{x: 15, y: 25}],
          radius: 10,
          strength: 6,
          blurType: 'pixelated',
        },
      ],
    });

    store.getState().createBlurTemplate('One');
    const templateId = store.getState().blurTemplates[0].id;

    const updated = store.getState().updateBlurTemplate(templateId, 'One Updated');
    expect(updated.ok).toBe(true);
    expect(store.getState().blurTemplates[0].name).toBe('One Updated');

    const deleted = store.getState().deleteBlurTemplate(templateId);
    expect(deleted.ok).toBe(true);
    expect(store.getState().blurTemplates).toHaveLength(0);
  });

  it('reorders templates and persists the updated order', () => {
    const store = useEditorStore;
    store.setState({
      blurTemplates: [
        makeTemplate('template-1', 'Faces'),
        makeTemplate('template-2', 'Names'),
        makeTemplate('template-3', 'Plates'),
      ],
      selectedTemplateId: 'template-2',
    });

    const result = store.getState().reorderBlurTemplates(0, 2);
    expect(result.ok).toBe(true);
    expect(store.getState().blurTemplates.map((template) => template.id)).toEqual([
      'template-2',
      'template-3',
      'template-1',
    ]);
    expect(store.getState().selectedTemplateId).toBe('template-2');

    const persisted = JSON.parse(localStorage.getItem(BLUR_TEMPLATES_STORAGE_KEY) ?? '[]') as {
      id: string;
    }[];
    expect(persisted.map((template) => template.id)).toEqual([
      'template-2',
      'template-3',
      'template-1',
    ]);
  });

  it('keeps template order unchanged for same-index reorder', () => {
    const store = useEditorStore;
    store.setState({
      blurTemplates: [makeTemplate('template-1', 'Faces'), makeTemplate('template-2', 'Names')],
    });

    const before = store.getState().blurTemplates.map((template) => template.id);
    const result = store.getState().reorderBlurTemplates(1, 1);

    expect(result.ok).toBe(true);
    expect(store.getState().blurTemplates.map((template) => template.id)).toEqual(before);
  });

  it('loads template without replacing existing strokes and pushes history', () => {
    const store = useEditorStore;
    store.getState().initializeEditor({image1: 'img', image2: null, width: 100, height: 100});

    store.setState({
      blurStrokes: [
        {
          points: [{x: 8, y: 8}],
          radius: 4,
          strength: 4,
          blurType: 'normal',
        },
      ],
      imageWidth: 100,
      imageHeight: 100,
    });

    const created = store.getState().createBlurTemplate('Loadable');
    expect(created.ok).toBe(true);

    const templateId = store.getState().blurTemplates[0].id;

    store.setState({
      blurStrokes: [
        {
          points: [{x: 60, y: 60}],
          radius: 20,
          strength: 12,
          blurType: 'pixelated',
        },
      ],
      isDrawing: true,
      currentStroke: {
        points: [{x: 1, y: 1}],
        radius: 2,
        strength: 2,
        blurType: 'normal',
      },
    });

    const historyBefore = store.getState().history.length;
    const loaded = store.getState().loadBlurTemplate(templateId);

    expect(loaded.ok).toBe(true);
    expect(store.getState().blurStrokes).toHaveLength(2);
    expect(store.getState().blurStrokes[0].points[0].x).toBeCloseTo(60);
    expect(store.getState().blurStrokes[1].points[0].x).toBeCloseTo(8);
    expect(store.getState().isDrawing).toBe(false);
    expect(store.getState().currentStroke).toBeNull();
    expect(store.getState().history.length).toBe(historyBefore + 1);
  });

  it('toggles split-view sidebar visibility without mutating outlines visibility', () => {
    const store = useEditorStore;

    store.setState({showSplitViewSidebar: false, showBlurOutlines: false});
    store.getState().toggleSplitViewSidebar();

    expect(store.getState().showSplitViewSidebar).toBe(true);
    expect(store.getState().showBlurOutlines).toBe(false);

    store.getState().setSplitViewSidebarOpen(false);

    expect(store.getState().showSplitViewSidebar).toBe(false);
    expect(store.getState().showBlurOutlines).toBe(false);
  });
});
