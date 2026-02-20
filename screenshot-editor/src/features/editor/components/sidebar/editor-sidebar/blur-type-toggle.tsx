import {Droplets, Grid3X3} from 'lucide-react';
import {Label} from '@/components/ui/label';
import {ShortcutTooltip} from '@/features/editor/components/common/shortcut-tooltip';
import type {BlurType} from '@/features/editor/state/types';

interface BlurTypeToggleProps {
  blurTypeTooltip: string;
  canEditBlurType: boolean;
  displayedBlurType: BlurType;
  onBlurTypeChange: (nextType: BlurType) => void;
}

export function BlurTypeToggle({
  blurTypeTooltip,
  canEditBlurType,
  displayedBlurType,
  onBlurTypeChange,
}: BlurTypeToggleProps) {
  return (
    <div>
      <ShortcutTooltip content={blurTypeTooltip}>
        <Label className="text-muted-foreground mb-2 block w-fit cursor-help text-xs">
          Blur Type
        </Label>
      </ShortcutTooltip>
      <div className="flex gap-1">
        <button
          type="button"
          disabled={!canEditBlurType}
          onClick={() => onBlurTypeChange('normal')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            displayedBlurType === 'normal'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:hover:bg-secondary'
          }`}>
          <Droplets className="h-3 w-3" />
          Normal
        </button>
        <button
          type="button"
          disabled={!canEditBlurType}
          onClick={() => onBlurTypeChange('pixelated')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            displayedBlurType === 'pixelated'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:hover:bg-secondary'
          }`}>
          <Grid3X3 className="h-3 w-3" />
          Pixelated
        </button>
      </div>
    </div>
  );
}
