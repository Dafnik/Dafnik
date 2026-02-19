import {useCallback, useEffect, useState} from 'react';
import type {KeyboardEvent, ReactNode} from 'react';
import {
  Download,
  Fullscreen,
  ImagePlus,
  Minus,
  Plus,
  Redo2,
  Settings2,
  SplitSquareVertical,
  Undo2,
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Tooltip, TooltipContent, TooltipTrigger} from '@/components/ui/tooltip';
import {confirmResetProject} from '@/features/editor/lib/confirm-reset-project';
import {formatShortcutTooltip} from '@/features/editor/lib/shortcut-definitions';
import {useEditorStore} from '@/features/editor/state/use-editor-store';

interface ShortcutTooltipProps {
  content: string;
  children: ReactNode;
}

function ShortcutTooltip({content, children}: ShortcutTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{content}</TooltipContent>
    </Tooltip>
  );
}

export function EditorToolbar() {
  const zoom = useEditorStore((state) => state.zoom);
  const canUndo = useEditorStore((state) => state.canUndo);
  const canRedo = useEditorStore((state) => state.canRedo);
  const showSplitViewSidebar = useEditorStore((state) => state.showSplitViewSidebar);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const toggleSplitViewSidebar = useEditorStore((state) => state.toggleSplitViewSidebar);
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

  const handleCenterCanvas = useCallback(() => {
    setPan(0, 0);
  }, [setPan]);

  const handleNewProject = useCallback(() => {
    if (!confirmResetProject()) return;
    resetProject();
  }, [resetProject]);

  useEffect(() => {
    setZoomInput(String(zoom));
  }, [zoom]);

  const newProjectTooltip = formatShortcutTooltip('New project', ['new-project']);
  const zoomStepTooltip = formatShortcutTooltip('Zoom +/-', ['zoom-step']);
  const zoomInputTooltip = formatShortcutTooltip('Zoom', ['zoom', 'zoom-step']);
  const undoTooltip = formatShortcutTooltip('Undo', ['undo']);
  const redoTooltip = formatShortcutTooltip('Redo', ['redo']);
  const exportTooltip = formatShortcutTooltip('Export', ['export']);

  return (
    <header
      className="border-border flex h-12 flex-shrink-0 items-center justify-between border-b-2 px-3"
      style={{background: 'oklch(var(--sidebar-background))'}}>
      <div className="flex items-center gap-2">
        <span className="text-foreground hidden text-sm font-black tracking-wider uppercase sm:block">
          Screenshot Editor
        </span>
        <div className="bg-border mx-1 h-6 w-0.5" />

        <ShortcutTooltip content={newProjectTooltip}>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2.5 text-xs"
            onClick={handleNewProject}>
            <ImagePlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New</span>
          </Button>
        </ShortcutTooltip>

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

        <ShortcutTooltip content={zoomStepTooltip}>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setZoom(Math.max(10, zoom - 10))}
            aria-label="Zoom out">
            <Minus className="h-3.5 w-3.5" />
          </Button>
        </ShortcutTooltip>

        <ShortcutTooltip content={zoomInputTooltip}>
          <div className="relative" data-testid="zoom-input-shortcut-trigger">
            <input
              type="text"
              value={zoomInput}
              onChange={(event) => setZoomInput(event.target.value)}
              onKeyDown={handleZoomInput}
              onBlur={() => setZoomInput(String(zoom))}
              className="bg-secondary text-secondary-foreground focus:ring-primary h-7 w-14 rounded-md border-0 text-center text-xs tabular-nums outline-none focus:ring-1"
              aria-label="Zoom percentage"
            />
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 text-[10px]">
              %
            </span>
          </div>
        </ShortcutTooltip>

        <ShortcutTooltip content={zoomStepTooltip}>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setZoom(Math.min(500, zoom + 10))}
            aria-label="Zoom in">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </ShortcutTooltip>
      </div>

      <div className="flex items-center gap-1">
        <ShortcutTooltip content={undoTooltip}>
          <span className="inline-flex">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={undo}
              disabled={!canUndo}
              aria-label="Undo">
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
          </span>
        </ShortcutTooltip>
        <ShortcutTooltip content={redoTooltip}>
          <span className="inline-flex">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={redo}
              disabled={!canRedo}
              aria-label="Redo">
              <Redo2 className="h-3.5 w-3.5" />
            </Button>
          </span>
        </ShortcutTooltip>
        <Button
          variant={showSplitViewSidebar ? 'default' : 'ghost'}
          size="sm"
          className="h-7 gap-1.5 px-2.5 text-xs"
          onClick={toggleSplitViewSidebar}>
          <SplitSquareVertical className="h-3.5 w-3.5" />
          Split View
        </Button>
        <div className="bg-border mx-1 h-6 w-0.5" />
        <ShortcutTooltip content={exportTooltip}>
          <Button size="sm" className="h-7 px-3 text-xs" onClick={openExportModal}>
            <Download className="mr-1.5 h-3 w-3" />
            Export
          </Button>
        </ShortcutTooltip>
      </div>
    </header>
  );
}
