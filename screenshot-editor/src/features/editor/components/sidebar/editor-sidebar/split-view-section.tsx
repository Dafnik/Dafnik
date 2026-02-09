import type {RefObject} from 'react';
import {
  ArrowLeftRight,
  ArrowUpDown,
  ImageIcon,
  Slash,
  SplitSquareVertical,
  Upload,
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Label} from '@/components/ui/label';
import {Slider} from '@/components/ui/slider';
import type {LightImageSide, SplitDirection} from '@/features/editor/state/types';
import {ShortcutTooltip} from './shortcut-tooltip';

interface SplitViewSectionProps {
  image2: string | null;
  splitDirection: SplitDirection;
  splitRatio: number;
  lightImageSide: LightImageSide;
  uploadDialogTooltip: string;
  directionTooltip: string;
  placementTooltip: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onSetSplitDirection: (direction: SplitDirection) => void;
  onSetSplitRatio: (value: number) => void;
  onSetLightImageSide: (side: LightImageSide) => void;
  onRemoveSecondImage: () => void;
}

export function SplitViewSection({
  image2,
  splitDirection,
  splitRatio,
  lightImageSide,
  uploadDialogTooltip,
  directionTooltip,
  placementTooltip,
  fileInputRef,
  onSetSplitDirection,
  onSetSplitRatio,
  onSetLightImageSide,
  onRemoveSecondImage,
}: SplitViewSectionProps) {
  return (
    <div className="border-border border-b-2 p-4">
      <div className="mb-4 flex items-center gap-2">
        <SplitSquareVertical className="text-primary h-4 w-4" />
        <h3 className="text-foreground text-sm font-semibold">Split View</h3>
      </div>

      {!image2 ? (
        <div>
          <ShortcutTooltip content={uploadDialogTooltip}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="border-border bg-secondary/30 text-muted-foreground hover:text-foreground hover:border-muted-foreground flex w-full items-center justify-center gap-2 rounded-md border border-dashed px-3 py-3 text-xs transition-colors">
              <Upload className="h-3.5 w-3.5" />
              Add second image
            </button>
          </ShortcutTooltip>
          <p className="text-muted-foreground mt-2 text-center text-[10px]">
            Add a second image for light/dark mode split
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <ShortcutTooltip content={directionTooltip}>
              <Label className="text-muted-foreground mb-2 block w-fit cursor-help text-xs">
                Direction
              </Label>
            </ShortcutTooltip>
            <div className="grid grid-cols-4 gap-1">
              {[
                {dir: 'vertical' as SplitDirection, icon: ArrowLeftRight},
                {dir: 'horizontal' as SplitDirection, icon: ArrowUpDown},
                {dir: 'diagonal-tl-br' as SplitDirection, icon: Slash},
                {dir: 'diagonal-tr-bl' as SplitDirection, icon: Slash},
              ].map(({dir, icon: Icon}) => (
                <button
                  key={dir}
                  type="button"
                  onClick={() => onSetSplitDirection(dir)}
                  aria-label={`Set split direction to ${dir}`}
                  className={`flex items-center justify-center rounded-md p-2 transition-colors ${
                    splitDirection === dir
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}>
                  <Icon className={`h-4 w-4 ${dir === 'diagonal-tr-bl' ? 'scale-x-[-1]' : ''}`} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-muted-foreground text-xs">Split Ratio</Label>
              <span className="text-muted-foreground text-xs tabular-nums">{splitRatio}%</span>
            </div>
            <Slider
              value={[splitRatio]}
              onValueChange={([value]) => onSetSplitRatio(value)}
              min={10}
              max={90}
              step={1}
              className="w-full"
            />
          </div>

          <div>
            <ShortcutTooltip content={placementTooltip}>
              <Label className="text-muted-foreground mb-2 block w-fit cursor-help text-xs">
                Placement
              </Label>
            </ShortcutTooltip>
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => onSetLightImageSide('left')}
                className={`rounded-md px-2 py-2 text-center text-[11px] leading-tight transition-colors ${
                  lightImageSide === 'left'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}>
                <div className="font-semibold">Light Left</div>
                <div className="opacity-80">Dark Right</div>
              </button>
              <button
                type="button"
                onClick={() => onSetLightImageSide('right')}
                className={`rounded-md px-2 py-2 text-center text-[11px] leading-tight transition-colors ${
                  lightImageSide === 'right'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}>
                <div className="font-semibold">Light Right</div>
                <div className="opacity-80">Dark Left</div>
              </button>
            </div>
          </div>

          <div>
            <Button
              variant="secondary"
              size="sm"
              onClick={onRemoveSecondImage}
              className="w-full text-xs">
              <ImageIcon className="mr-1.5 h-3 w-3" />
              Remove second image
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
