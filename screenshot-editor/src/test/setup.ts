import '@testing-library/jest-dom/vitest';
import {afterEach, beforeEach} from 'vitest';
import {cleanup} from '@testing-library/react';
import {useEditorStore} from '@/features/editor/state/use-editor-store';

beforeEach(() => {
  localStorage.clear();
  useEditorStore.persist.clearStorage();
  useEditorStore.getState().resetProject();
  useEditorStore.getState().resetSettingsToDefaults();
});

afterEach(() => {
  cleanup();
});
