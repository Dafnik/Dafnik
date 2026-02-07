import {useCallback, useRef} from 'react';
import type {ChangeEvent} from 'react';
import {
  ArrowLeftRight,
  ArrowUpDown,
  Droplets,
  Grid3X3,
  ImageIcon,
  MousePointer2,
  Slash,
  SplitSquareVertical,
  Upload,
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Label} from '@/components/ui/label';
import {Slider} from '@/components/ui/slider';
import type {SplitDirection} from '@/features/editor/state/types';
import {useEditorStore} from '@/features/editor/state/use-editor-store';

interface EditorSidebarProps {
  onAddSecondImage: (dataUrl: string) => void;
}

export function EditorSidebar({onAddSecondImage}: EditorSidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const image2 = useEditorStore((state) => state.image2);
  const activeTool = useEditorStore((state) => state.activeTool);
  const blurType = useEditorStore((state) => state.blurType);
  const brushRadius = useEditorStore((state) => state.brushRadius);
  const brushStrength = useEditorStore((state) => state.brushStrength);
  const splitRatio = useEditorStore((state) => state.splitRatio);
  const splitDirection = useEditorStore((state) => state.splitDirection);
  const lightImageSide = useEditorStore((state) => state.lightImageSide);
  const showBlurOutlines = useEditorStore((state) => state.showBlurOutlines);

  const setActiveTool = useEditorStore((state) => state.setActiveTool);
  const setBlurType = useEditorStore((state) => state.setBlurType);
  const setBrushRadius = useEditorStore((state) => state.setBrushRadius);
  const setBrushStrength = useEditorStore((state) => state.setBrushStrength);
  const setSplitRatio = useEditorStore((state) => state.setSplitRatio);
  const setSplitDirection = useEditorStore((state) => state.setSplitDirection);
  const setLightImageSide = useEditorStore((state) => state.setLightImageSide);
  const removeSecondImage = useEditorStore((state) => state.removeSecondImage);
  const setShowBlurOutlines = useEditorStore((state) => state.setShowBlurOutlines);

  const handleFileSelect = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        onAddSecondImage(loadEvent.target?.result as string);
      };
      reader.readAsDataURL(file);
      event.target.value = '';
    },
    [onAddSecondImage],
  );

  return (
    <aside
      className="border-border flex h-full w-64 flex-shrink-0 flex-col overflow-y-auto border-r"
      style={{background: 'hsl(var(--sidebar-background))'}}>
      <div className="border-border border-b p-4">
        <Label className="text-muted-foreground mb-2 block text-xs">Tool</Label>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setActiveTool('select')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
              activeTool === 'select'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}>
            <MousePointer2 className="h-3.5 w-3.5" />
            Select
          </button>
          <button
            type="button"
            onClick={() => setActiveTool('blur')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
              activeTool === 'blur'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}>
            <Droplets className="h-3.5 w-3.5" />
            Blur Brush
          </button>
        </div>
      </div>

      <div
        className={`border-border border-b p-4 transition-opacity ${activeTool !== 'blur' ? 'pointer-events-none opacity-40' : ''}`}>
        <div className="mb-4 flex items-center gap-2">
          <Droplets className="text-primary h-4 w-4" />
          <h3 className="text-foreground text-sm font-semibold">Blur Settings</h3>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-muted-foreground mb-2 block text-xs">Blur Type</Label>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setBlurType('normal')}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  blurType === 'normal'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}>
                <Droplets className="h-3 w-3" />
                Normal
              </button>
              <button
                type="button"
                onClick={() => setBlurType('pixelated')}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  blurType === 'pixelated'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}>
                <Grid3X3 className="h-3 w-3" />
                Pixelated
              </button>
            </div>
          </div>

          <div>
            <Label className="text-muted-foreground mb-2 block text-xs">Outlines</Label>
            <button
              type="button"
              aria-pressed={showBlurOutlines}
              onClick={() => setShowBlurOutlines(!showBlurOutlines)}
              className={`flex w-full items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                showBlurOutlines
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}>
              Show Blur Outlines
            </button>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-muted-foreground text-xs">Radius</Label>
              <span className="text-muted-foreground text-xs tabular-nums">{brushRadius}px</span>
            </div>
            <Slider
              value={[brushRadius]}
              onValueChange={([value]) => setBrushRadius(value)}
              min={5}
              max={100}
              step={1}
              className="w-full"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-muted-foreground text-xs">Strength</Label>
              <span className="text-muted-foreground text-xs tabular-nums">{brushStrength}</span>
            </div>
            <Slider
              value={[brushStrength]}
              onValueChange={([value]) => setBrushStrength(value)}
              min={1}
              max={30}
              step={1}
              className="w-full"
            />
          </div>
        </div>
      </div>

      <div className="border-border border-b p-4">
        <div className="mb-4 flex items-center gap-2">
          <SplitSquareVertical className="text-primary h-4 w-4" />
          <h3 className="text-foreground text-sm font-semibold">Split View</h3>
        </div>

        {!image2 ? (
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
            <div>
              <Label className="text-muted-foreground mb-2 block text-xs">Direction</Label>
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
                    onClick={() => setSplitDirection(dir, {commitHistory: true})}
                    className={`flex items-center justify-center rounded-md p-2 transition-colors ${
                      splitDirection === dir
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                    title={dir}>
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
                onValueChange={([value]) => setSplitRatio(value, {debouncedHistory: true})}
                min={10}
                max={90}
                step={1}
                className="w-full"
              />
            </div>

            <div>
              <Label className="text-muted-foreground mb-2 block text-xs">Placement</Label>
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setLightImageSide('left', {reorderImages: true})}
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
                  onClick={() => setLightImageSide('right', {reorderImages: true})}
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
                onClick={removeSecondImage}
                className="w-full text-xs">
                <ImageIcon className="mr-1.5 h-3 w-3" />
                Remove second image
              </Button>
            </div>
          </div>
        )}
      </div>

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
          <div className="flex justify-between">
            <span>Toggle outlines</span>
            <kbd className="bg-secondary text-secondary-foreground rounded px-1.5 py-0.5 font-mono">
              Ctrl+D
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
