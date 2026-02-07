import {describe, expect, it} from 'vitest';
import {useEditorStore} from '@/features/editor/state/use-editor-store';

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

  it('loads template by replacing strokes and pushing history', () => {
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
    expect(store.getState().blurStrokes).toHaveLength(1);
    expect(store.getState().blurStrokes[0].points[0].x).toBeCloseTo(8);
    expect(store.getState().isDrawing).toBe(false);
    expect(store.getState().currentStroke).toBeNull();
    expect(store.getState().history.length).toBe(historyBefore + 1);
  });

  it('syncs outlines visibility with template panel open state', () => {
    const store = useEditorStore;

    store.setState({showTemplatePanel: false, showBlurOutlines: false});
    store.getState().toggleTemplatePanel();

    expect(store.getState().showTemplatePanel).toBe(true);
    expect(store.getState().showBlurOutlines).toBe(true);

    store.getState().setTemplatePanelOpen(false);

    expect(store.getState().showTemplatePanel).toBe(false);
    expect(store.getState().showBlurOutlines).toBe(false);
  });
});
