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

  it('keeps structural sharing for historical stroke snapshots', () => {
    const store = useEditorStore;
    store.getState().initializeEditor({image1: 'img-1', image2: null, width: 100, height: 100});

    store.getState().setActiveTool('blur');
    store.getState().startStroke(10, 10);
    store.getState().appendStrokePoints([
      {x: 12, y: 12},
      {x: 16, y: 16},
    ]);
    store.getState().finishStroke();

    const afterFirstStroke = store.getState();
    const firstStrokeReference = afterFirstStroke.blurStrokes[0];
    const firstSnapshotStrokeReference =
      afterFirstStroke.history[afterFirstStroke.historyIndex]?.blurStrokes[0];

    expect(firstSnapshotStrokeReference).toBe(firstStrokeReference);

    store.getState().startStroke(20, 20);
    store.getState().appendStrokePoint(24, 24);
    store.getState().finishStroke();

    const afterSecondStroke = store.getState();
    const firstSnapshotAfterSecond = afterSecondStroke.history[1]?.blurStrokes[0];
    expect(firstSnapshotAfterSecond).toBe(firstStrokeReference);
  });

  it('tracks clearing blur strokes in history and supports undo', () => {
    const store = useEditorStore;
    store.getState().initializeEditor({image1: 'img-1', image2: null, width: 100, height: 100});

    store.getState().setActiveTool('blur');
    store.getState().startStroke(5, 5);
    store.getState().appendStrokePoint(15, 15);
    store.getState().finishStroke();

    const historyAfterStroke = store.getState().history.length;

    store.getState().clearBlurStrokes();
    expect(store.getState().blurStrokes).toHaveLength(0);
    expect(store.getState().history).toHaveLength(historyAfterStroke + 1);

    store.getState().undo();
    expect(store.getState().blurStrokes).toHaveLength(1);
  });

  it('appends stroke points in a single batched update', () => {
    const store = useEditorStore;
    store.getState().initializeEditor({image1: 'img-1', image2: null, width: 100, height: 100});
    store.getState().setActiveTool('blur');
    store.getState().startStroke(5, 5);

    store.getState().appendStrokePoints([
      {x: 7, y: 7},
      {x: 9, y: 9},
      {x: 11, y: 11},
    ]);

    const currentStroke = store.getState().currentStroke;
    expect(currentStroke?.points).toHaveLength(4);
    expect(currentStroke?.points.at(-1)).toEqual({x: 11, y: 11});
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
