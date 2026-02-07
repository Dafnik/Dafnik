import {useCallback, useEffect, useRef, useState} from 'react';
import {DropZone} from '@/components/drop-zone';
import {EditorCanvas} from '@/components/editor-canvas';
import {EditorSidebar} from '@/components/editor-sidebar';
import {EditorToolbar} from '@/components/editor-toolbar';
import {ExportModal} from '@/components/export-modal';
import {
  type EditorState,
  type BlurStroke,
  type BlurType,
  type ActiveTool,
  type SplitDirection,
  type HistoryEntry,
  initialEditorState,
  getHistoryEntry,
  applyHistoryEntry,
} from '@/lib/editor-store';

export default function App() {
  const [state, setState] = useState<EditorState>(initialEditorState);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<BlurStroke | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);

  // Push to history
  const pushHistory = useCallback(
    (newState: EditorState) => {
      const entry = getHistoryEntry(newState);
      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push(entry);
        return newHistory;
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex],
  );

  // Debounced history push for continuous inputs (sliders, etc.)
  const debouncedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pushHistoryDebounced = useCallback(
    (newState: EditorState) => {
      if (debouncedTimerRef.current) {
        clearTimeout(debouncedTimerRef.current);
      }
      debouncedTimerRef.current = setTimeout(() => {
        pushHistory(newState);
        debouncedTimerRef.current = null;
      }, 400);
    },
    [pushHistory],
  );

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debouncedTimerRef.current) {
        clearTimeout(debouncedTimerRef.current);
      }
    };
  }, []);

  // Undo
  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    const entry = history[newIndex];
    setState((prev) => applyHistoryEntry(prev, entry));
    setHistoryIndex(newIndex);
  }, [history, historyIndex]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    const entry = history[newIndex];
    setState((prev) => applyHistoryEntry(prev, entry));
    setHistoryIndex(newIndex);
  }, [history, historyIndex]);

  // Prevent browser zoom on the entire page
  useEffect(() => {
    const preventBrowserZoom = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };
    document.addEventListener('wheel', preventBrowserZoom, {passive: false});
    return () => document.removeEventListener('wheel', preventBrowserZoom);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  // Read a saved setting from localStorage
  const readSetting = useCallback((key: string): string | null => {
    try {
      return localStorage.getItem(`editor-${key}`);
    } catch {
      return null;
    }
  }, []);

  // Initial image load - restore all settings from localStorage
  const handleImagesLoaded = useCallback(
    (image1: string, image2: string | null) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // Restore split settings (only apply if two images)
        let savedRatio = initialEditorState.splitRatio;
        let savedDirection = initialEditorState.splitDirection;
        if (image2) {
          const storedRatio = readSetting('split-ratio');
          const storedDirection = readSetting('split-direction');
          if (storedRatio) savedRatio = Number(storedRatio);
          if (
            storedDirection &&
            ['horizontal', 'vertical', 'diagonal-tl-br', 'diagonal-tr-bl'].includes(storedDirection)
          ) {
            savedDirection = storedDirection as SplitDirection;
          }
        }

        // Restore brush, tool, and zoom settings (always)
        let savedBrushRadius = initialEditorState.brushRadius;
        let savedBrushStrength = initialEditorState.brushStrength;
        let savedBlurType = initialEditorState.blurType as string;
        let savedActiveTool = initialEditorState.activeTool as string;
        let savedZoom = 100;

        const storedRadius = readSetting('brush-radius');
        const storedStrength = readSetting('brush-strength');
        const storedBlurType = readSetting('blur-type');
        const storedTool = readSetting('active-tool');
        const storedZoom = readSetting('zoom');

        if (storedRadius) savedBrushRadius = Number(storedRadius);
        if (storedStrength) savedBrushStrength = Number(storedStrength);
        if (storedBlurType && ['normal', 'pixelated'].includes(storedBlurType))
          savedBlurType = storedBlurType;
        if (storedTool && ['select', 'blur'].includes(storedTool)) savedActiveTool = storedTool;
        if (storedZoom) savedZoom = Math.max(10, Math.min(500, Number(storedZoom)));

        const newState: EditorState = {
          ...initialEditorState,
          image1,
          image2,
          splitRatio: image2 ? savedRatio : initialEditorState.splitRatio,
          splitDirection: image2 ? savedDirection : initialEditorState.splitDirection,
          brushRadius: savedBrushRadius,
          brushStrength: savedBrushStrength,
          blurType: savedBlurType as BlurType,
          activeTool: savedActiveTool as ActiveTool,
          imageWidth: img.naturalWidth,
          imageHeight: img.naturalHeight,
          zoom: savedZoom,
          panX: 0,
          panY: 0,
        };
        setState(newState);
        const entry = getHistoryEntry(newState);
        setHistory([entry]);
        setHistoryIndex(0);
        setIsEditing(true);
      };
      img.src = image1;
    },
    [readSetting],
  );

  // Drawing handlers
  const handleDrawStart = useCallback(
    (x: number, y: number) => {
      if (state.activeTool !== 'blur') return;
      setIsDrawing(true);
      setCurrentStroke({
        points: [{x, y}],
        radius: state.brushRadius,
        strength: state.brushStrength,
        blurType: state.blurType,
      });
    },
    [state.activeTool, state.brushRadius, state.brushStrength, state.blurType],
  );

  const handleDrawMove = useCallback(
    (x: number, y: number) => {
      if (!isDrawing || !currentStroke) return;
      setCurrentStroke((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          points: [...prev.points, {x, y}],
        };
      });
    },
    [isDrawing, currentStroke],
  );

  const handleDrawEnd = useCallback(() => {
    if (!currentStroke || currentStroke.points.length === 0) {
      setIsDrawing(false);
      setCurrentStroke(null);
      return;
    }
    const newState = {
      ...state,
      blurStrokes: [...state.blurStrokes, currentStroke],
    };
    setState(newState);
    pushHistory(newState);
    setIsDrawing(false);
    setCurrentStroke(null);
  }, [currentStroke, state, pushHistory]);

  // Persist a setting to localStorage
  const persistSetting = useCallback((key: string, value: string) => {
    try {
      localStorage.setItem(`editor-${key}`, value);
    } catch {}
  }, []);

  // Blur tool settings - persist to localStorage
  const handleBrushRadiusChange = useCallback(
    (v: number) => {
      setState((prev) => ({...prev, brushRadius: v}));
      persistSetting('brush-radius', String(v));
    },
    [persistSetting],
  );

  const handleBrushStrengthChange = useCallback(
    (v: number) => {
      setState((prev) => ({...prev, brushStrength: v}));
      persistSetting('brush-strength', String(v));
    },
    [persistSetting],
  );

  const handleBlurTypeChange = useCallback(
    (t: BlurType) => {
      setState((prev) => ({...prev, blurType: t}));
      persistSetting('blur-type', t);
    },
    [persistSetting],
  );

  const handleActiveToolChange = useCallback(
    (tool: ActiveTool) => {
      setState((prev) => ({...prev, activeTool: tool}));
      persistSetting('active-tool', tool);
    },
    [persistSetting],
  );

  // Split controls - persist settings to localStorage
  const handleSplitRatioChange = useCallback(
    (v: number) => {
      setState((prev) => {
        const newState = {...prev, splitRatio: v};
        pushHistoryDebounced(newState);
        return newState;
      });
      try {
        localStorage.setItem('editor-split-ratio', String(v));
      } catch {}
    },
    [pushHistoryDebounced],
  );

  const handleSplitDirectionChange = useCallback(
    (d: SplitDirection) => {
      const newState = {...state, splitDirection: d};
      setState(newState);
      pushHistory(newState);
      try {
        localStorage.setItem('editor-split-direction', d);
      } catch {}
    },
    [state, pushHistory],
  );

  const handleSwapImages = useCallback(() => {
    const newState = {
      ...state,
      image1: state.image2,
      image2: state.image1,
    };
    setState(newState);
    pushHistory(newState);
  }, [state, pushHistory]);

  const handleAddSecondImage = useCallback(
    (dataUrl: string) => {
      const newState = {...state, image2: dataUrl};
      setState(newState);
      pushHistory(newState);
    },
    [state, pushHistory],
  );

  const handleRemoveSecondImage = useCallback(() => {
    const newState = {...state, image2: null};
    setState(newState);
    pushHistory(newState);
  }, [state, pushHistory]);

  // Zoom + Pan
  const handleZoomChange = useCallback(
    (zoom: number) => {
      setState((prev) => ({...prev, zoom}));
      persistSetting('zoom', String(zoom));
    },
    [persistSetting],
  );

  const handlePanChange = useCallback((panX: number, panY: number) => {
    setState((prev) => ({...prev, panX, panY}));
  }, []);

  const handleResetView = useCallback(() => {
    setState((prev) => ({...prev, zoom: 100, panX: 0, panY: 0}));
  }, []);

  // Reset all persisted settings to defaults
  const handleResetSettings = useCallback(() => {
    const keys = [
      'split-ratio',
      'split-direction',
      'brush-radius',
      'brush-strength',
      'blur-type',
      'active-tool',
      'zoom',
    ];
    for (const key of keys) {
      try {
        localStorage.removeItem(`editor-${key}`);
      } catch {}
    }
    setState((prev) => ({
      ...prev,
      splitRatio: initialEditorState.splitRatio,
      splitDirection: initialEditorState.splitDirection,
      brushRadius: initialEditorState.brushRadius,
      brushStrength: initialEditorState.brushStrength,
      blurType: initialEditorState.blurType,
      activeTool: initialEditorState.activeTool,
      zoom: 100,
    }));
  }, []);

  // Reset to drop zone
  const handleReset = useCallback(() => {
    setState(initialEditorState);
    setHistory([]);
    setHistoryIndex(-1);
    setIsDrawing(false);
    setCurrentStroke(null);
    setIsEditing(false);
    setCanvasEl(null);
  }, []);

  // Export
  const handleExport = useCallback(() => {
    setShowExportModal(true);
  }, []);

  if (!isEditing) {
    return <DropZone onImagesLoaded={handleImagesLoaded} />;
  }

  return (
    <div className="flex h-screen w-screen flex-col">
      <EditorToolbar
        zoom={state.zoom}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={undo}
        onRedo={redo}
        onZoomChange={handleZoomChange}
        onResetView={handleResetView}
        onExport={handleExport}
        onReset={handleReset}
        onResetSettings={handleResetSettings}
      />
      <div className="flex flex-1 overflow-hidden">
        <EditorSidebar
          state={state}
          onActiveToolChange={handleActiveToolChange}
          onBrushRadiusChange={handleBrushRadiusChange}
          onBrushStrengthChange={handleBrushStrengthChange}
          onBlurTypeChange={handleBlurTypeChange}
          onSplitRatioChange={handleSplitRatioChange}
          onSplitDirectionChange={handleSplitDirectionChange}
          onSwapImages={handleSwapImages}
          onAddSecondImage={handleAddSecondImage}
          onRemoveSecondImage={handleRemoveSecondImage}
        />
        <EditorCanvas
          state={state}
          isDrawing={isDrawing}
          onDrawStart={handleDrawStart}
          onDrawMove={handleDrawMove}
          onDrawEnd={handleDrawEnd}
          onZoomChange={handleZoomChange}
          onPanChange={handlePanChange}
          currentStroke={currentStroke}
          onCanvasReady={setCanvasEl}
        />
      </div>
      <ExportModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        canvasRef={canvasEl}
      />
    </div>
  );
}
