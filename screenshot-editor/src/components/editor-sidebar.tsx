import React from 'react';

import {useCallback, useRef} from 'react';
import type {
  EditorState,
  SplitDirection,
  BlurType,
  ActiveTool,
  LightImageSide,
} from '@/lib/editor-store';
import {
  Droplets,
  Grid3X3,
  ArrowLeftRight,
  ArrowUpDown,
  Slash,
  SplitSquareVertical,
  Upload,
  ImageIcon,
  MousePointer2,
} from 'lucide-react';
import {Slider} from '@/components/ui/slider';
import {Label} from '@/components/ui/label';
import {Button} from '@/components/ui/button';

interface EditorSidebarProps {
  state: EditorState;
  onActiveToolChange: (tool: ActiveTool) => void;
  onBrushRadiusChange: (v: number) => void;
  onBrushStrengthChange: (v: number) => void;
  onBlurTypeChange: (t: BlurType) => void;
  onSplitRatioChange: (v: number) => void;
  onSplitDirectionChange: (d: SplitDirection) => void;
  lightImageSide: LightImageSide;
  onLightImageSideChange: (side: LightImageSide) => void;
  onAddSecondImage: (dataUrl: string) => void;
  onRemoveSecondImage: () => void;
}

export function EditorSidebar({
  state,
  onActiveToolChange,
  onBrushRadiusChange,
  onBrushStrengthChange,
  onBlurTypeChange,
  onSplitRatioChange,
  onSplitDirectionChange,
  lightImageSide,
  onLightImageSideChange,
  onAddSecondImage,
  onRemoveSecondImage,
}: EditorSidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        onAddSecondImage(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    },
    [onAddSecondImage],
  );

  return (
    <aside
      className="border-border flex h-full w-64 flex-shrink-0 flex-col overflow-y-auto border-r"
      style={{background: 'hsl(var(--sidebar-background))'}}>
      {/* Tool Selector */}
      <div className="border-border border-b p-4">
        <Label className="text-muted-foreground mb-2 block text-xs">Tool</Label>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onActiveToolChange('select')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
              state.activeTool === 'select'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}>
            <MousePointer2 className="h-3.5 w-3.5" />
            Select
          </button>
          <button
            type="button"
            onClick={() => onActiveToolChange('blur')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
              state.activeTool === 'blur'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}>
            <Droplets className="h-3.5 w-3.5" />
            Blur Brush
          </button>
        </div>
      </div>

      {/* Blur Brush Settings */}
      <div
        className={`border-border border-b p-4 transition-opacity ${state.activeTool !== 'blur' ? 'pointer-events-none opacity-40' : ''}`}>
        <div className="mb-4 flex items-center gap-2">
          <Droplets className="text-primary h-4 w-4" />
          <h3 className="text-foreground text-sm font-semibold">Blur Settings</h3>
        </div>

        <div className="space-y-4">
          {/* Blur Type */}
          <div>
            <Label className="text-muted-foreground mb-2 block text-xs">Blur Type</Label>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => onBlurTypeChange('normal')}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  state.blurType === 'normal'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}>
                <Droplets className="h-3 w-3" />
                Normal
              </button>
              <button
                type="button"
                onClick={() => onBlurTypeChange('pixelated')}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  state.blurType === 'pixelated'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}>
                <Grid3X3 className="h-3 w-3" />
                Pixelated
              </button>
            </div>
          </div>

          {/* Radius */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-muted-foreground text-xs">Radius</Label>
              <span className="text-muted-foreground text-xs tabular-nums">
                {state.brushRadius}px
              </span>
            </div>
            <Slider
              value={[state.brushRadius]}
              onValueChange={([v]) => onBrushRadiusChange(v)}
              min={5}
              max={100}
              step={1}
              className="w-full"
            />
          </div>

          {/* Strength */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-muted-foreground text-xs">Strength</Label>
              <span className="text-muted-foreground text-xs tabular-nums">
                {state.brushStrength}
              </span>
            </div>
            <Slider
              value={[state.brushStrength]}
              onValueChange={([v]) => onBrushStrengthChange(v)}
              min={1}
              max={30}
              step={1}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Split View Section */}
      <div className="border-border border-b p-4">
        <div className="mb-4 flex items-center gap-2">
          <SplitSquareVertical className="text-primary h-4 w-4" />
          <h3 className="text-foreground text-sm font-semibold">Split View</h3>
        </div>

        {!state.image2 ? (
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="border-border bg-secondary/30 text-muted-foreground hover:text-foreground hover:border-muted-foreground flex w-full items-center justify-center gap-2 rounded-md border border-dashed px-3 py-3 text-xs transition-colors">
              <Upload className="h-3.5 w-3.5" />
              Add second image
            </button>
            <p className="text-muted-foreground mt-2 text-center text-[10px]">
              Add a second image for light/dark mode split
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Direction */}
            <div>
              <Label className="text-muted-foreground mb-2 block text-xs">Direction</Label>
              <div className="grid grid-cols-4 gap-1">
                {[
                  {dir: 'vertical' as SplitDirection, icon: ArrowLeftRight, label: 'V'},
                  {dir: 'horizontal' as SplitDirection, icon: ArrowUpDown, label: 'H'},
                  {dir: 'diagonal-tl-br' as SplitDirection, icon: Slash, label: '\\'},
                  {dir: 'diagonal-tr-bl' as SplitDirection, icon: Slash, label: '/'},
                ].map(({dir, icon: Icon, label}) => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => onSplitDirectionChange(dir)}
                    className={`flex items-center justify-center rounded-md p-2 transition-colors ${
                      state.splitDirection === dir
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                    title={dir}>
                    <Icon className={`h-4 w-4 ${dir === 'diagonal-tr-bl' ? 'scale-x-[-1]' : ''}`} />
                  </button>
                ))}
              </div>
            </div>

            {/* Ratio */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label className="text-muted-foreground text-xs">Split Ratio</Label>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {state.splitRatio}%
                </span>
              </div>
              <Slider
                value={[state.splitRatio]}
                onValueChange={([v]) => onSplitRatioChange(v)}
                min={10}
                max={90}
                step={1}
                className="w-full"
              />
            </div>

            {/* Light/Dark Side Placement */}
            <div>
              <Label className="text-muted-foreground mb-2 block text-xs">Placement</Label>
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => onLightImageSideChange('left')}
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
                  onClick={() => onLightImageSideChange('right')}
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

      {/* Keyboard Shortcuts */}
      <div className="mt-auto p-4">
        <h3 className="text-muted-foreground mb-2 text-xs font-semibold">Shortcuts</h3>
        <div className="text-muted-foreground space-y-1 text-[10px]">
          <div className="flex justify-between">
            <span>Undo</span>
            <kbd className="bg-secondary text-secondary-foreground rounded px-1.5 py-0.5 font-mono">
              Ctrl+Z
            </kbd>
          </div>
          <div className="flex justify-between">
            <span>Redo</span>
            <kbd className="bg-secondary text-secondary-foreground rounded px-1.5 py-0.5 font-mono">
              Ctrl+Y
            </kbd>
          </div>
          <div className="flex justify-between">
            <span>Pan</span>
            <kbd className="bg-secondary text-secondary-foreground rounded px-1.5 py-0.5 font-mono">
              Alt+Drag
            </kbd>
          </div>
          <div className="flex justify-between">
            <span>Zoom</span>
            <kbd className="bg-secondary text-secondary-foreground rounded px-1.5 py-0.5 font-mono">
              Scroll
            </kbd>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </aside>
  );
}
