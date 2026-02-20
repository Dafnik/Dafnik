import {Brush, Square} from 'lucide-react';
import {Label} from '@/components/ui/label';
import {ShortcutTooltip} from '@/features/editor/components/common/shortcut-tooltip';
import type {BlurStrokeShape} from '@/features/editor/state/types';

interface BlurModeToggleProps {
  modeTooltip: string;
  canEditBlurMode: boolean;
  blurStrokeShape: BlurStrokeShape;
  onBlurStrokeShapeChange: (nextShape: BlurStrokeShape) => void;
}

export function BlurModeToggle({
  modeTooltip,
  canEditBlurMode,
  blurStrokeShape,
  onBlurStrokeShapeChange,
}: BlurModeToggleProps) {
  return (
    <div>
      <ShortcutTooltip content={modeTooltip}>
        <Label className="text-muted-foreground mb-2 block w-fit cursor-help text-xs">Mode</Label>
      </ShortcutTooltip>
      <div className="flex gap-1">
        <button
          type="button"
          disabled={!canEditBlurMode}
          onClick={() => onBlurStrokeShapeChange('brush')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            blurStrokeShape === 'brush'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:hover:bg-secondary'
          }`}>
          <Brush className="h-3 w-3" />
          Brush
        </button>
        <button
          type="button"
          disabled={!canEditBlurMode}
          onClick={() => onBlurStrokeShapeChange('box')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            blurStrokeShape === 'box'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:hover:bg-secondary'
          }`}>
          <Square className="h-3 w-3" />
          Area
        </button>
      </div>
    </div>
  );
}
