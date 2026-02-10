import {loadBlurTemplates} from '@/features/editor/state/blur-templates-storage';
import {loadLegacySettingsOnce} from '@/features/editor/state/persistence';
import {DEFAULT_SETTINGS} from '@/features/editor/state/types';
import type {HistorySnapshot} from '@/features/editor/state/types';

export function createBaseState() {
  const migratedLegacySettings = loadLegacySettingsOnce();
  const initialSettings = {
    ...DEFAULT_SETTINGS,
    ...migratedLegacySettings,
  };
  const initialBlurTemplates = loadBlurTemplates();

  return {
    image1: null,
    image2: null,
    imageWidth: 0,
    imageHeight: 0,
    splitRatio: initialSettings.splitRatio,
    splitDirection: initialSettings.splitDirection,
    blurStrokes: [],
    activeTool: initialSettings.activeTool,
    blurType: initialSettings.blurType,
    blurStrokeShape: initialSettings.blurStrokeShape,
    brushRadius: initialSettings.brushRadius,
    brushStrength: initialSettings.brushStrength,
    isShiftPressed: false,
    lightImageSide: initialSettings.lightImageSide,
    showBlurOutlines: false,
    zoom: initialSettings.zoom,
    panX: 0,
    panY: 0,
    isDrawing: false,
    currentStroke: null,
    isEditing: false,
    showExportModal: false,
    exportBaseName: null,
    showShortcutsModal: false,
    showLightSelectorModal: false,
    selectorFirstImage: null,
    selectorSecondImage: null,
    lightSelectorState: 'idle' as const,
    showSplitViewSidebar: false,
    selectedTemplateId: null,
    blurTemplates: initialBlurTemplates,
    selectedStrokeIndices: [],
    history: [] as HistorySnapshot[],
    historyIndex: -1,
    canUndo: false,
    canRedo: false,
  };
}
