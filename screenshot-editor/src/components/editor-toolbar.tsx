import React from 'react';

import {useCallback, useEffect, useState} from 'react';
import {Undo2, Redo2, Minus, Plus, RotateCcw, Download, ImagePlus, Settings2} from 'lucide-react';
import {Button} from '@/components/ui/button';

interface EditorToolbarProps {
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onZoomChange: (zoom: number) => void;
  onResetView: () => void;
  onExport: () => void;
  onReset: () => void;
  onResetSettings: () => void;
}

export function EditorToolbar({
  zoom,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onZoomChange,
  onResetView,
  onExport,
  onReset,
  onResetSettings,
}: EditorToolbarProps) {
  const [zoomInput, setZoomInput] = useState(String(zoom));

  const handleZoomInput = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        const val = parseInt(zoomInput);
        if (!isNaN(val) && val >= 10 && val <= 500) {
          onZoomChange(val);
        } else {
          setZoomInput(String(zoom));
        }
      }
    },
    [zoomInput, zoom, onZoomChange],
  );

  const handleZoomBlur = useCallback(() => {
    setZoomInput(String(zoom));
  }, [zoom]);

  // Keep zoom input synced with external changes
  useEffect(() => {
    setZoomInput(String(zoom));
  }, [zoom]);

  return (
    <header
      className="border-border flex h-11 flex-shrink-0 items-center justify-between border-b px-3"
      style={{background: 'hsl(var(--sidebar-background))'}}>
      {/* Left: Logo */}
      <div className="flex items-center gap-2">
        <div className="bg-primary flex h-6 w-6 items-center justify-center rounded">
          <span className="text-primary-foreground text-xs font-bold">S</span>
        </div>
        <span className="text-foreground hidden text-sm font-semibold sm:block">
          Screenshot Editor
        </span>
        <div className="bg-border mx-1 h-5 w-px" />
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2.5 text-xs"
          onClick={onReset}
          title="New project">
          <ImagePlus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">New</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2.5 text-xs"
          onClick={onResetSettings}
          title="Reset all settings to defaults">
          <Settings2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Reset Settings</span>
        </Button>
      </div>

      {/* Center: Zoom Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onZoomChange(Math.max(10, zoom - 10))}
          title="Zoom out">
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <div className="relative">
          <input
            type="text"
            value={zoomInput}
            onChange={(e) => setZoomInput(e.target.value)}
            onKeyDown={handleZoomInput}
            onBlur={handleZoomBlur}
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
          onClick={() => onZoomChange(Math.min(500, zoom + 10))}
          title="Zoom in">
          <Plus className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="ml-1 h-7 w-7"
          onClick={onResetView}
          title="Reset view">
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Right: Undo/Redo + Export */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)">
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)">
          <Redo2 className="h-3.5 w-3.5" />
        </Button>
        <div className="bg-border mx-1 h-5 w-px" />
        <Button size="sm" className="h-7 px-3 text-xs" onClick={onExport}>
          <Download className="mr-1.5 h-3 w-3" />
          Export
        </Button>
      </div>
    </header>
  );
}
