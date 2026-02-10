import {describe, expect, it} from 'vitest';
import {useEditorStore} from '@/features/editor/state/use-editor-store';

describe('store split-view sidebar behavior', () => {
  it('opens split-view sidebar when editor initializes with two images', () => {
    const store = useEditorStore;
    store.getState().initializeEditor({image1: 'img-1', image2: 'img-2', width: 100, height: 100});

    expect(store.getState().showSplitViewSidebar).toBe(true);
  });

  it('keeps split-view sidebar closed when editor initializes with one image', () => {
    const store = useEditorStore;
    store.getState().initializeEditor({image1: 'img-1', image2: null, width: 100, height: 100});

    expect(store.getState().showSplitViewSidebar).toBe(false);
  });

  it('opens split-view sidebar when a second image is added after initialization', () => {
    const store = useEditorStore;
    store.getState().initializeEditor({image1: 'img-1', image2: null, width: 100, height: 100});
    store.setState({showSplitViewSidebar: false});

    store.getState().addSecondImage('img-2');

    expect(store.getState().showSplitViewSidebar).toBe(true);
  });
});
