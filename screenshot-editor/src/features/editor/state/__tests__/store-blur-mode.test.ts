import {describe, expect, it} from 'vitest';
import {useEditorStore} from '@/features/editor/state/use-editor-store';

describe('store blur mode actions', () => {
  it('updates blur stroke shape via setBlurStrokeShape', () => {
    const store = useEditorStore;
    store.setState({blurStrokeShape: 'brush'});

    store.getState().setBlurStrokeShape('box');
    expect(store.getState().blurStrokeShape).toBe('box');

    store.getState().setBlurStrokeShape('brush');
    expect(store.getState().blurStrokeShape).toBe('brush');
  });
});
