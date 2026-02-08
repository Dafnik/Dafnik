import {useCallback, useEffect, useRef} from 'react';
import type {ChangeEvent, ReactNode} from 'react';
import {
  ArrowLeftRight,
  ArrowUpDown,
  Droplets,
  Grid3X3,
  ImageIcon,
  Keyboard,
  MousePointer2,
  Slash,
  SplitSquareVertical,
  Upload,
} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Label} from '@/components/ui/label';
import {Slider} from '@/components/ui/slider';
import {Tooltip, TooltipContent, TooltipTrigger} from '@/components/ui/tooltip';
import {
  formatShortcutById,
  formatShortcutTooltip,
} from '@/features/editor/lib/shortcut-definitions';
import type {SplitDirection} from '@/features/editor/state/types';
import {useEditorStore} from '@/features/editor/state/use-editor-store';

interface EditorSidebarProps {
  onAddSecondImage: (dataUrl: string) => void;
}

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

function normalizeKey(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key;
}

function isOpenUploadShortcut(event: KeyboardEvent): boolean {
  return (
    (event.ctrlKey || event.metaKey) && (normalizeKey(event.key) === 'u' || event.code === 'KeyU')
  );
}

function isTypingElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  const nearest = target.closest<HTMLElement>(
    'input, textarea, select, [contenteditable=""], [contenteditable="true"]',
  );
  if (!nearest) return false;

  if (nearest.isContentEditable) return true;
  return (
    nearest instanceof HTMLInputElement ||
    nearest instanceof HTMLTextAreaElement ||
    nearest instanceof HTMLSelectElement
  );
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
  const openShortcutsModal = useEditorStore((state) => state.openShortcutsModal);

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

  const switchToolTooltip = formatShortcutTooltip('Switch tool', ['switch-tool']);
  const blurTypeTooltip = formatShortcutTooltip('Toggle blur type', ['toggle-blur-type']);
  const outlinesTooltip = formatShortcutTooltip('Toggle outlines', ['toggle-outlines']);
  const radiusTooltip = formatShortcutTooltip('Radius +/-', ['radius-step']);
  const strengthTooltip = formatShortcutTooltip('Strength +/-', ['strength-step']);
  const directionTooltip = formatShortcutTooltip('Cycle split direction', [
    'cycle-split-direction',
  ]);
  const placementTooltip = formatShortcutTooltip('Split placement', ['toggle-split-placement']);
  const shortcutsTooltip = formatShortcutTooltip('Shortcuts', ['shortcuts-modal']);
  const uploadDialogTooltip = formatShortcutTooltip('Open file dialog', ['open-upload-dialog']);

  useEffect(() => {
    if (image2) return;

    const handleShortcut = (event: KeyboardEvent) => {
      if (!isOpenUploadShortcut(event)) return;
      if (isTypingElement(event.target) || isTypingElement(document.activeElement)) return;

      event.preventDefault();
      fileInputRef.current?.click();
    };

    window.addEventListener('keydown', handleShortcut, true);
    return () => window.removeEventListener('keydown', handleShortcut, true);
  }, [image2]);

  return (
    <aside
      className="border-border flex h-full w-64 flex-shrink-0 flex-col overflow-y-auto border-r-2"
      style={{background: 'oklch(var(--sidebar-background))'}}>
      <div className="border-border border-b-2 p-4">
        <Label className="text-muted-foreground mb-2 block text-xs">Tool</Label>
        <div className="flex gap-1">
          <ShortcutTooltip content={switchToolTooltip}>
            <button
              type="button"
              onClick={() => setActiveTool('select')}
              className={`flex flex-1 items-center justify-center gap-1.5 border-2 px-3 py-2 text-xs font-bold tracking-wide uppercase transition-colors ${
                activeTool === 'select'
                  ? 'bg-primary text-primary-foreground border-foreground shadow-[2px_2px_0_0_rgba(0,0,0,0.72)]'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}>
              <MousePointer2 className="h-3.5 w-3.5" />
              Select
            </button>
          </ShortcutTooltip>
          <ShortcutTooltip content={switchToolTooltip}>
            <button
              type="button"
              onClick={() => setActiveTool('blur')}
              className={`flex flex-1 items-center justify-center gap-1.5 border-2 px-3 py-2 text-xs font-bold tracking-wide uppercase transition-colors ${
                activeTool === 'blur'
                  ? 'bg-primary text-primary-foreground border-foreground shadow-[2px_2px_0_0_rgba(0,0,0,0.72)]'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}>
              <Droplets className="h-3.5 w-3.5" />
              Blur Brush
            </button>
          </ShortcutTooltip>
        </div>
      </div>

      <div
        className={`border-border border-b-2 p-4 transition-opacity ${activeTool !== 'blur' ? 'pointer-events-none opacity-40' : ''}`}>
        <div className="mb-4 flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Droplets className="text-primary h-4 w-4" />
            <h3 className="text-foreground text-sm font-semibold">Blur Settings</h3>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-muted-foreground mb-2 block text-xs">Blur Type</Label>
            <div className="flex gap-1">
              <ShortcutTooltip content={blurTypeTooltip}>
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
              </ShortcutTooltip>
              <ShortcutTooltip content={blurTypeTooltip}>
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
              </ShortcutTooltip>
            </div>
          </div>

          <div>
            <Label className="text-muted-foreground mb-2 block text-xs">Outlines</Label>
            <ShortcutTooltip content={outlinesTooltip}>
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
            </ShortcutTooltip>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <ShortcutTooltip content={radiusTooltip}>
                <Label className="text-muted-foreground text-xs">Radius</Label>
              </ShortcutTooltip>
              <span className="text-muted-foreground text-xs tabular-nums">{brushRadius}px</span>
            </div>
            <ShortcutTooltip content={radiusTooltip}>
              <div>
                <Slider
                  value={[brushRadius]}
                  onValueChange={([value]) => setBrushRadius(value)}
                  min={5}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
            </ShortcutTooltip>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <ShortcutTooltip content={strengthTooltip}>
                <Label className="text-muted-foreground text-xs">Strength</Label>
              </ShortcutTooltip>
              <span className="text-muted-foreground text-xs tabular-nums">{brushStrength}</span>
            </div>
            <ShortcutTooltip content={strengthTooltip}>
              <div>
                <Slider
                  value={[brushStrength]}
                  onValueChange={([value]) => setBrushStrength(value)}
                  min={1}
                  max={30}
                  step={1}
                  className="w-full"
                />
              </div>
            </ShortcutTooltip>
          </div>
        </div>
      </div>

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
                <Label className="text-muted-foreground mb-2 block text-xs">Direction</Label>
              </ShortcutTooltip>
              <div className="grid grid-cols-4 gap-1">
                {[
                  {dir: 'vertical' as SplitDirection, icon: ArrowLeftRight},
                  {dir: 'horizontal' as SplitDirection, icon: ArrowUpDown},
                  {dir: 'diagonal-tl-br' as SplitDirection, icon: Slash},
                  {dir: 'diagonal-tr-bl' as SplitDirection, icon: Slash},
                ].map(({dir, icon: Icon}) => (
                  <ShortcutTooltip key={dir} content={directionTooltip}>
                    <button
                      type="button"
                      onClick={() => setSplitDirection(dir, {commitHistory: true})}
                      aria-label={`Set split direction to ${dir}`}
                      className={`flex items-center justify-center rounded-md p-2 transition-colors ${
                        splitDirection === dir
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                      }`}>
                      <Icon
                        className={`h-4 w-4 ${dir === 'diagonal-tr-bl' ? 'scale-x-[-1]' : ''}`}
                      />
                    </button>
                  </ShortcutTooltip>
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
              <ShortcutTooltip content={placementTooltip}>
                <Label className="text-muted-foreground mb-2 block text-xs">Placement</Label>
              </ShortcutTooltip>
              <div className="grid grid-cols-2 gap-1">
                <ShortcutTooltip content={placementTooltip}>
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
                </ShortcutTooltip>
                <ShortcutTooltip content={placementTooltip}>
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
                </ShortcutTooltip>
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
        <ShortcutTooltip content={shortcutsTooltip}>
          <Button
            variant="secondary"
            size="sm"
            onClick={openShortcutsModal}
            className="w-full justify-between text-xs">
            <span className="flex items-center gap-1.5">
              <Keyboard className="h-3.5 w-3.5" />
              Shortcuts
            </span>
            <kbd className="bg-secondary text-secondary-foreground rounded px-1.5 py-0.5 font-mono text-[10px]">
              {formatShortcutById('shortcuts-modal')}
            </kbd>
          </Button>
        </ShortcutTooltip>
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
