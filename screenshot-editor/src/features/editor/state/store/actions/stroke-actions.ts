import type {EditorStoreActions} from '@/features/editor/state/types';
import type {StoreContext} from '@/features/editor/state/store/types';

export function createStrokeActions({
  set,
  get,
}: StoreContext): Pick<
  EditorStoreActions,
  | 'setActiveTool'
  | 'setIsShiftPressed'
  | 'setBrushRadius'
  | 'setBrushStrength'
  | 'setBlurType'
  | 'setBlurStrokeShape'
  | 'setZoom'
  | 'setPan'
  | 'updateBlurStrokesAtIndices'
  | 'appendBlurStrokes'
  | 'startStroke'
  | 'setCurrentStrokeEndpoint'
  | 'appendStrokePoints'
  | 'appendStrokePoint'
  | 'finishStroke'
  | 'cancelStroke'
  | 'clearBlurStrokes'
  | 'setShowBlurOutlines'
  | 'setSelectedStrokeIndices'
> {
  return {
    setActiveTool: (activeTool) => set({activeTool}),
    setIsShiftPressed: (isShiftPressed) => set({isShiftPressed}),
    setBrushRadius: (brushRadius) => set({brushRadius}),
    setBrushStrength: (brushStrength) => set({brushStrength}),
    setBlurType: (blurType) => set({blurType}),
    setBlurStrokeShape: (blurStrokeShape) => set({blurStrokeShape}),
    setZoom: (value) => set({zoom: Math.max(10, Math.min(500, value))}),
    setPan: (panX, panY) => set({panX, panY}),

    updateBlurStrokesAtIndices: (indices, patch, options) => {
      const state = get();
      const targetIndices = [...new Set(indices)]
        .filter((index) => Number.isInteger(index))
        .filter((index) => index >= 0 && index < state.blurStrokes.length);
      if (targetIndices.length === 0) return false;

      const hasPatch =
        patch.radius !== undefined || patch.strength !== undefined || patch.blurType !== undefined;
      if (!hasPatch) return false;

      const selectedSet = new Set(targetIndices);
      let hasChanged = false;
      const nextStrokes = state.blurStrokes.map((stroke, index) => {
        if (!selectedSet.has(index)) return stroke;

        let strokeChanged = false;
        let nextStroke = stroke;

        if (patch.radius !== undefined && stroke.radius !== patch.radius) {
          nextStroke = nextStroke === stroke ? {...nextStroke} : nextStroke;
          nextStroke.radius = patch.radius;
          strokeChanged = true;
        }

        if (patch.strength !== undefined && stroke.strength !== patch.strength) {
          nextStroke = nextStroke === stroke ? {...nextStroke} : nextStroke;
          nextStroke.strength = patch.strength;
          strokeChanged = true;
        }

        if (patch.blurType !== undefined && stroke.blurType !== patch.blurType) {
          nextStroke = nextStroke === stroke ? {...nextStroke} : nextStroke;
          nextStroke.blurType = patch.blurType;
          strokeChanged = true;
        }

        if (!strokeChanged) return stroke;
        hasChanged = true;
        return nextStroke;
      });

      if (!hasChanged) return false;

      set({
        blurStrokes: nextStrokes,
        isDrawing: false,
        currentStroke: null,
      });

      if (options?.commitHistory ?? false) {
        get().pushHistorySnapshot();
      }
      return true;
    },

    appendBlurStrokes: (strokes, options) => {
      const validStrokes = strokes.filter((stroke) => stroke.points.length > 0);
      if (validStrokes.length === 0) return false;

      set((state) => ({
        blurStrokes: [...state.blurStrokes, ...validStrokes],
        isDrawing: false,
        currentStroke: null,
      }));

      if (options?.commitHistory ?? true) {
        get().pushHistorySnapshot();
      }
      return true;
    },

    startStroke: (x, y, options) => {
      const state = get();
      if (state.activeTool !== 'blur') return;
      const shape = options?.shape ?? 'brush';

      set({
        isDrawing: true,
        currentStroke: {
          points:
            shape === 'box'
              ? [
                  {x, y},
                  {x, y},
                ]
              : [{x, y}],
          radius: state.brushRadius,
          strength: state.brushStrength,
          blurType: state.blurType,
          shape,
        },
      });
    },

    setCurrentStrokeEndpoint: (x, y) => {
      set((state) => {
        if (!state.isDrawing || !state.currentStroke) return {};
        if ((state.currentStroke.shape ?? 'brush') !== 'box') return {};

        const startPoint = state.currentStroke.points[0];
        if (!startPoint) return {};

        return {
          currentStroke: {
            ...state.currentStroke,
            points: [startPoint, {x, y}],
          },
        };
      });
    },

    appendStrokePoints: (points) => {
      if (points.length === 0) return;

      set((state) => {
        if (!state.isDrawing || !state.currentStroke) return {};
        return {
          currentStroke: {
            ...state.currentStroke,
            points: [...state.currentStroke.points, ...points],
          },
        };
      });
    },

    appendStrokePoint: (x, y) => {
      get().appendStrokePoints([{x, y}]);
    },

    finishStroke: () => {
      const state = get();
      if (!state.currentStroke || state.currentStroke.points.length === 0) {
        set({isDrawing: false, currentStroke: null});
        return;
      }

      set((prev) => ({
        blurStrokes: [...prev.blurStrokes, prev.currentStroke!],
        isDrawing: false,
        currentStroke: null,
      }));
      get().pushHistorySnapshot();
    },

    cancelStroke: () => set({isDrawing: false, currentStroke: null}),
    clearBlurStrokes: () => {
      const state = get();
      if (state.blurStrokes.length === 0 && !state.currentStroke) return;

      set({
        blurStrokes: [],
        isDrawing: false,
        currentStroke: null,
      });
      get().pushHistorySnapshot();
    },

    setShowBlurOutlines: (showBlurOutlines) => set({showBlurOutlines}),
    setSelectedStrokeIndices: (selectedStrokeIndices) => set({selectedStrokeIndices}),
  };
}
