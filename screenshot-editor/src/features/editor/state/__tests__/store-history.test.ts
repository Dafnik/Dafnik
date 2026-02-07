import {describe, expect, it, vi} from 'vitest';
import {useEditorStore} from '@/features/editor/state/use-editor-store';

describe('editor store history semantics', () => {
  it('tracks blur strokes in history and supports undo/redo', () => {
    const store = useEditorStore;
    store.getState().initializeEditor({image1: 'img-1', image2: null, width: 100, height: 100});

    expect(store.getState().history).toHaveLength(1);
    expect(store.getState().historyIndex).toBe(0);

    store.getState().setActiveTool('blur');
    store.getState().startStroke(10, 10);
    store.getState().appendStrokePoint(20, 20);
    store.getState().finishStroke();

    expect(store.getState().blurStrokes).toHaveLength(1);
    expect(store.getState().history).toHaveLength(2);
    expect(store.getState().historyIndex).toBe(1);

    store.getState().undo();
    expect(store.getState().blurStrokes).toHaveLength(0);
    expect(store.getState().historyIndex).toBe(0);

    store.getState().redo();
    expect(store.getState().blurStrokes).toHaveLength(1);
    expect(store.getState().historyIndex).toBe(1);
  });

  it('does not pollute history when changing zoom/pan/tool', () => {
    const store = useEditorStore;
    store.getState().initializeEditor({image1: 'img-1', image2: null, width: 100, height: 100});

    const historyLength = store.getState().history.length;

    store.getState().setZoom(180);
    store.getState().setPan(11, 12);
    store.getState().setActiveTool('blur');

    expect(store.getState().history).toHaveLength(historyLength);
  });

  it('pushes split ratio history entries with debounce', () => {
    vi.useFakeTimers();

    const store = useEditorStore;
    store.getState().initializeEditor({image1: 'img-1', image2: 'img-2', width: 100, height: 100});

    const initialHistoryLength = store.getState().history.length;
    store.getState().setSplitRatio(65, {debouncedHistory: true});

    expect(store.getState().history).toHaveLength(initialHistoryLength);

    vi.advanceTimersByTime(450);
    expect(store.getState().history).toHaveLength(initialHistoryLength + 1);

    vi.useRealTimers();
  });
});
