import {useCallback, useEffect, useState} from 'react';
import type {KeyboardEvent} from 'react';
import {
  Download,
  Fullscreen,
  ImagePlus,
  Minus,
  Plus,
  Redo2,
  RotateCcw,
  Settings2,
  SquareLibrary,
  Undo2,
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {useEditorStore} from '@/features/editor/state/use-editor-store';

export function EditorToolbar() {
  const zoom = useEditorStore((state) => state.zoom);
  const canUndo = useEditorStore((state) => state.canUndo);
  const canRedo = useEditorStore((state) => state.canRedo);
  const showTemplatePanel = useEditorStore((state) => state.showTemplatePanel);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const toggleTemplatePanel = useEditorStore((state) => state.toggleTemplatePanel);
  const setZoom = useEditorStore((state) => state.setZoom);
  const setPan = useEditorStore((state) => state.setPan);
  const openExportModal = useEditorStore((state) => state.openExportModal);
  const resetProject = useEditorStore((state) => state.resetProject);
  const resetSettingsToDefaults = useEditorStore((state) => state.resetSettingsToDefaults);

  const [zoomInput, setZoomInput] = useState(String(zoom));

  const handleZoomInput = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== 'Enter') return;

      const value = parseInt(zoomInput, 10);
      if (!Number.isNaN(value) && value >= 10 && value <= 500) {
        setZoom(value);
      } else {
        setZoomInput(String(zoom));
      }
    },
    [setZoom, zoom, zoomInput],
  );

  const handleResetView = useCallback(() => {
    setZoom(100);
    setPan(0, 0);
  }, [setPan, setZoom]);

  const handleCenterCanvas = useCallback(() => {
    setPan(0, 0);
  }, [setPan]);

  useEffect(() => {
    setZoomInput(String(zoom));
  }, [zoom]);

  return (
    <header
      className="border-border flex h-12 flex-shrink-0 items-center justify-between border-b-2 px-3"
      style={{background: 'oklch(var(--sidebar-background))'}}>
      <div className="flex items-center gap-2">
        <div className="bg-primary border-foreground flex h-7 w-7 items-center justify-center border-2 shadow-[2px_2px_0_0_rgba(0,0,0,0.72)]">
          <span className="text-primary-foreground text-xs font-black">S</span>
        </div>
        <span className="text-foreground hidden text-sm font-black tracking-wider uppercase sm:block">
          Screenshot Editor
        </span>
        <div className="bg-border mx-1 h-6 w-0.5" />

        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2.5 text-xs"
          onClick={resetProject}>
          <ImagePlus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">New</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2.5 text-xs"
          onClick={resetSettingsToDefaults}>
          <Settings2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Reset Settings</span>
        </Button>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="mr-1 h-7 gap-1.5 px-2.5 text-xs"
          onClick={handleCenterCanvas}
          title="Center canvas">
          <Fullscreen className="h-3.5 w-3.5" />
          Center
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setZoom(Math.max(10, zoom - 10))}
          title="Zoom out">
          <Minus className="h-3.5 w-3.5" />
        </Button>

        <div className="relative">
          <input
            type="text"
            value={zoomInput}
            onChange={(event) => setZoomInput(event.target.value)}
            onKeyDown={handleZoomInput}
            onBlur={() => setZoomInput(String(zoom))}
            className="bg-secondary text-secondary-foreground focus:ring-primary h-7 w-14 rounded-md border-0 text-center text-xs tabular-nums outline-none focus:ring-1"
          />
          <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 text-[10px]">
            %
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setZoom(Math.min(500, zoom + 10))}
          title="Zoom in">
          <Plus className="h-3.5 w-3.5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleResetView}
          title="Reset view">
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={undo} disabled={!canUndo}>
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={redo} disabled={!canRedo}>
          <Redo2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={showTemplatePanel ? 'default' : 'ghost'}
          size="sm"
          className="h-7 gap-1.5 px-2.5 text-xs"
          onClick={toggleTemplatePanel}>
          <SquareLibrary className="h-3.5 w-3.5" />
          Template
        </Button>
        <div className="bg-border mx-1 h-6 w-0.5" />
        <Button size="sm" className="h-7 px-3 text-xs" onClick={openExportModal}>
          <Download className="mr-1.5 h-3 w-3" />
          Export
        </Button>
      </div>
    </header>
  );
}
