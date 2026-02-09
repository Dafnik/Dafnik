import {Droplets, Eye, Grid3X3, RotateCcw} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Label} from '@/components/ui/label';
import {Slider} from '@/components/ui/slider';
import type {BlurType} from '@/features/editor/state/types';
import {ShortcutTooltip} from './shortcut-tooltip';

interface BlurSettingsSectionProps {
  blurTypeTooltip: string;
  outlinesTooltip: string;
  radiusTooltip: string;
  strengthTooltip: string;
  outlinesTogglePressed: boolean;
  outlinesForcedOn: boolean;
  showBlurOutlines: boolean;
  canEditBlurType: boolean;
  canEditStrength: boolean;
  canEditRadius: boolean;
  displayedBlurType: BlurType;
  displayedStrength: number;
  brushRadius: number;
  onToggleOutlines: () => void;
  onClearBlurStrokes: () => void;
  onBlurTypeChange: (nextType: BlurType) => void;
  onStrengthChange: (nextStrength: number) => void;
  onStrengthCommit: (nextStrength: number) => void;
  onRadiusChange: (value: number) => void;
}

export function BlurSettingsSection({
  blurTypeTooltip,
  outlinesTooltip,
  radiusTooltip,
  strengthTooltip,
  outlinesTogglePressed,
  outlinesForcedOn,
  showBlurOutlines,
  canEditBlurType,
  canEditStrength,
  canEditRadius,
  displayedBlurType,
  displayedStrength,
  brushRadius,
  onToggleOutlines,
  onClearBlurStrokes,
  onBlurTypeChange,
  onStrengthChange,
  onStrengthCommit,
  onRadiusChange,
}: BlurSettingsSectionProps) {
  return (
    <div className="border-border border-b-2 p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Droplets className="text-primary h-4 w-4" />
          <h3 className="text-foreground text-sm font-semibold">Blur Settings</h3>
        </div>
        <div className="flex items-center gap-1">
          <ShortcutTooltip content={outlinesTooltip}>
            <Button
              type="button"
              variant={outlinesTogglePressed ? 'default' : 'secondary'}
              size="icon"
              aria-label="Toggle blur outlines"
              aria-pressed={outlinesTogglePressed}
              disabled={outlinesForcedOn}
              onClick={onToggleOutlines}
              className="h-7 w-7">
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </ShortcutTooltip>
          <ShortcutTooltip content="Reset all blurs">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label="Reset all blurs"
              onClick={onClearBlurStrokes}
              className="h-7 w-7">
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </ShortcutTooltip>
        </div>
      </div>

      <div className="space-y-4">
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

        <div>
          <div className="mb-2 flex items-center justify-between">
            <ShortcutTooltip content={strengthTooltip}>
              <Label
                className={`text-xs ${canEditStrength ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>
                Strength
              </Label>
            </ShortcutTooltip>
            <span
              className={`text-xs tabular-nums ${canEditStrength ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>
              {displayedStrength}
            </span>
          </div>
          <ShortcutTooltip content={strengthTooltip}>
            <div
              className={`rounded-md px-1 py-1 transition-opacity ${
                canEditStrength
                  ? ''
                  : 'bg-muted/35 border-border/70 border border-dashed opacity-55'
              }`}>
              <Slider
                value={[displayedStrength]}
                onValueChange={([value]) => onStrengthChange(value)}
                onValueCommit={([value]) => onStrengthCommit(value)}
                min={1}
                max={30}
                step={1}
                disabled={!canEditStrength}
                className="w-full"
              />
            </div>
          </ShortcutTooltip>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <ShortcutTooltip content={radiusTooltip}>
              <Label
                className={`text-xs ${canEditRadius ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>
                Radius
              </Label>
            </ShortcutTooltip>
            <span
              className={`text-xs tabular-nums ${canEditRadius ? 'text-muted-foreground' : 'text-muted-foreground/70'}`}>
              {brushRadius}px
            </span>
          </div>
          <ShortcutTooltip content={radiusTooltip}>
            <div
              className={`rounded-md px-1 py-1 transition-opacity ${
                canEditRadius ? '' : 'bg-muted/35 border-border/70 border border-dashed opacity-55'
              }`}>
              <Slider
                value={[brushRadius]}
                onValueChange={([value]) => onRadiusChange(value)}
                min={5}
                max={100}
                step={1}
                disabled={!canEditRadius}
                className="w-full"
              />
            </div>
          </ShortcutTooltip>
        </div>
      </div>
    </div>
  );
}
