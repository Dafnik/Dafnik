import {Droplets, Hand, MousePointer2} from 'lucide-react';
import {Label} from '@/components/ui/label';
import type {ActiveTool} from '@/features/editor/state/types';
import {ShortcutTooltip} from './shortcut-tooltip';

interface ToolSectionProps {
  activeTool: ActiveTool;
  switchToolTooltip: string;
  onSetActiveTool: (tool: ActiveTool) => void;
}

export function ToolSection({activeTool, switchToolTooltip, onSetActiveTool}: ToolSectionProps) {
  return (
    <div className="border-border border-b-2 p-4">
      <ShortcutTooltip content={switchToolTooltip}>
        <Label className="text-muted-foreground mb-2 block w-fit cursor-help text-xs">Tool</Label>
      </ShortcutTooltip>
      <div data-testid="tool-grid" className="grid grid-cols-2 gap-1">
        <button
          type="button"
          onClick={() => onSetActiveTool('drag')}
          className={`flex w-full items-center justify-center gap-1.5 border-2 px-3 py-2 text-xs font-bold tracking-wide uppercase transition-colors ${
            activeTool === 'drag'
              ? 'bg-primary text-primary-foreground border-foreground shadow-[2px_2px_0_0_rgba(0,0,0,0.72)]'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}>
          <Hand className="h-3.5 w-3.5" />
          Drag
        </button>
        <button
          type="button"
          onClick={() => onSetActiveTool('select')}
          className={`flex w-full items-center justify-center gap-1.5 border-2 px-3 py-2 text-xs font-bold tracking-wide uppercase transition-colors ${
            activeTool === 'select'
              ? 'bg-primary text-primary-foreground border-foreground shadow-[2px_2px_0_0_rgba(0,0,0,0.72)]'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}>
          <MousePointer2 className="h-3.5 w-3.5" />
          Select
        </button>
        <button
          type="button"
          onClick={() => onSetActiveTool('blur')}
          className={`flex w-full items-center justify-center gap-1.5 border-2 px-3 py-2 text-xs font-bold tracking-wide uppercase transition-colors ${
            activeTool === 'blur'
              ? 'bg-primary text-primary-foreground border-foreground shadow-[2px_2px_0_0_rgba(0,0,0,0.72)]'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}>
          <Droplets className="h-3.5 w-3.5" />
          Blur
        </button>
      </div>
    </div>
  );
}
