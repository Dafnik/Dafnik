export type SplitDirection = 'horizontal' | 'vertical' | 'diagonal-tl-br' | 'diagonal-tr-bl';
export type BlurType = 'normal' | 'pixelated';
export type BlurStrokeShape = 'brush' | 'box';
export type ActiveTool = 'drag' | 'select' | 'blur';
export type LightImageSide = 'left' | 'right';

export interface Point {
  x: number;
  y: number;
}

export interface BlurStroke {
  points: Point[];
  radius: number;
  strength: number;
  blurType: BlurType;
  shape?: BlurStrokeShape;
}

export type HistoryBlurStrokes = ReadonlyArray<BlurStroke>;

export interface NormalizedPoint {
  xRatio: number;
  yRatio: number;
}

export interface NormalizedBlurStroke {
  points: NormalizedPoint[];
  radiusRatio: number;
  strength: number;
  blurType: BlurType;
  shape?: BlurStrokeShape;
}

export interface BlurTemplate {
  id: string;
  name: string;
  sourceWidth: number;
  sourceHeight: number;
  strokes: NormalizedBlurStroke[];
  createdAt: string;
  updatedAt: string;
}

export interface HistorySnapshot {
  image1: string | null;
  image2: string | null;
  splitRatio: number;
  splitDirection: SplitDirection;
  blurStrokes: HistoryBlurStrokes;
}

export interface DocumentSlice {
  image1: string | null;
  image2: string | null;
  imageWidth: number;
  imageHeight: number;
  splitRatio: number;
  splitDirection: SplitDirection;
  blurStrokes: BlurStroke[];
}

export interface ToolSlice {
  activeTool: ActiveTool;
  blurType: BlurType;
  brushRadius: number;
  brushStrength: number;
  lightImageSide: LightImageSide;
  showBlurOutlines: boolean;
}

export interface ViewportSlice {
  zoom: number;
  panX: number;
  panY: number;
}

export interface InteractionSlice {
  isDrawing: boolean;
  currentStroke: BlurStroke | null;
}

export type LightSelectorState = 'idle' | 'awaitingSelection' | 'resolved' | 'cancelled';

export interface UiSlice {
  isEditing: boolean;
  showExportModal: boolean;
  exportBaseName: string | null;
  showShortcutsModal: boolean;
  showLightSelectorModal: boolean;
  selectorFirstImage: string | null;
  selectorSecondImage: string | null;
  lightSelectorState: LightSelectorState;
  showTemplatePanel: boolean;
  selectedTemplateId: string | null;
  blurTemplates: BlurTemplate[];
}

export interface HistorySlice {
  history: HistorySnapshot[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;
}

export interface PersistedSettings {
  splitRatio: number;
  splitDirection: SplitDirection;
  brushRadius: number;
  brushStrength: number;
  blurType: BlurType;
  activeTool: ActiveTool;
  lightImageSide: LightImageSide;
  zoom: number;
}

export interface InitializeEditorPayload {
  image1: string;
  image2: string | null;
  width: number;
  height: number;
  exportBaseName?: string | null;
}

export interface SetSplitDirectionOptions {
  commitHistory: boolean;
}

export interface SetSplitRatioOptions {
  debouncedHistory: boolean;
}

export interface SetLightImageSideOptions {
  reorderImages: boolean;
}

export interface UpdateBlurStrokesAtIndicesOptions {
  commitHistory: boolean;
}

export interface BlurStrokePatch {
  radius?: number;
  strength?: number;
  blurType?: BlurType;
}

export interface LightSelectorPayload {
  firstImage: string;
  secondImage: string;
}

export type LightSelection = 'first' | 'second' | 'cancel';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface EditorStoreActions {
  initializeEditor: (payload: InitializeEditorPayload) => void;
  resetProject: () => void;
  resetSettingsToDefaults: () => void;
  setActiveTool: (tool: ActiveTool) => void;
  setBrushRadius: (value: number) => void;
  setBrushStrength: (value: number) => void;
  setBlurType: (type: BlurType) => void;
  setSplitDirection: (
    direction: SplitDirection,
    options?: Partial<SetSplitDirectionOptions>,
  ) => void;
  setSplitRatio: (value: number, options?: Partial<SetSplitRatioOptions>) => void;
  setLightImageSide: (side: LightImageSide, options?: Partial<SetLightImageSideOptions>) => void;
  setZoom: (value: number) => void;
  setPan: (x: number, y: number) => void;
  updateBlurStrokesAtIndices: (
    indices: number[],
    patch: BlurStrokePatch,
    options?: Partial<UpdateBlurStrokesAtIndicesOptions>,
  ) => boolean;
  startStroke: (x: number, y: number, options?: {shape?: BlurStrokeShape}) => void;
  setCurrentStrokeEndpoint: (x: number, y: number) => void;
  appendStrokePoints: (points: Point[]) => void;
  appendStrokePoint: (x: number, y: number) => void;
  finishStroke: () => void;
  cancelStroke: () => void;
  clearBlurStrokes: () => void;
  setShowBlurOutlines: (enabled: boolean) => void;
  toggleTemplatePanel: () => void;
  setTemplatePanelOpen: (open: boolean) => void;
  setSelectedTemplate: (templateId: string | null) => void;
  createBlurTemplate: (name: string) => ActionResult;
  updateBlurTemplate: (templateId: string, name: string) => ActionResult;
  reorderBlurTemplates: (fromIndex: number, toIndex: number) => ActionResult;
  deleteBlurTemplate: (templateId: string) => ActionResult;
  loadBlurTemplate: (templateId: string) => ActionResult;
  openExportModal: () => void;
  closeExportModal: () => void;
  setExportBaseName: (name: string | null) => void;
  openShortcutsModal: () => void;
  closeShortcutsModal: () => void;
  toggleShortcutsModal: () => void;
  openLightSelector: (payload: LightSelectorPayload) => void;
  resolveLightSelector: (selection: LightSelection) => void;
  addSecondImage: (image: string) => void;
  removeSecondImage: () => void;
  pushHistorySnapshot: () => void;
  undo: () => void;
  redo: () => void;
}

export type EditorStoreState = DocumentSlice &
  ToolSlice &
  ViewportSlice &
  InteractionSlice &
  UiSlice &
  HistorySlice &
  EditorStoreActions;

export const DEFAULT_SETTINGS: PersistedSettings = {
  splitRatio: 50,
  splitDirection: 'vertical',
  brushRadius: 20,
  brushStrength: 10,
  blurType: 'normal',
  activeTool: 'drag',
  lightImageSide: 'left',
  zoom: 100,
};
