import '@testing-library/jest-dom/vitest';
import {afterEach, beforeEach} from 'vitest';
import {cleanup} from '@testing-library/react';
import {useEditorStore} from '@/features/editor/state/use-editor-store';
import {saveBlurTemplates} from '@/features/editor/state/blur-templates-storage';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;

beforeEach(() => {
  localStorage.clear();
  useEditorStore.persist.clearStorage();
  saveBlurTemplates([]);
  useEditorStore.getState().resetProject();
  useEditorStore.getState().resetSettingsToDefaults();
  useEditorStore.setState({
    blurTemplates: [],
    selectedTemplateId: null,
    showSplitViewSidebar: false,
  });
});

afterEach(() => {
  cleanup();
});
