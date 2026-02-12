import {
  AtSign,
  Brush,
  Droplets,
  Eye,
  Grid3X3,
  Loader2,
  Phone,
  Square,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
import {Button} from '@/components/ui/button';
import {Label} from '@/components/ui/label';
import {Slider} from '@/components/ui/slider';
import type {BlurStrokeShape, BlurType} from '@/features/editor/state/types';
import {ShortcutTooltip} from './shortcut-tooltip';

interface BlurSettingsSectionProps {
  modeTooltip: string;
  blurTypeTooltip: string;
  outlinesTooltip: string;
  radiusTooltip: string;
  strengthTooltip: string;
  outlinesTogglePressed: boolean;
  outlinesForcedOn: boolean;
  showBlurOutlines: boolean;
  canEditBlurMode: boolean;
  canEditBlurType: boolean;
  canEditStrength: boolean;
  canEditRadius: boolean;
  blurStrokeShape: BlurStrokeShape;
  displayedBlurType: BlurType;
  displayedStrength: number;
  brushRadius: number;
  onBlurStrokeShapeChange: (nextShape: BlurStrokeShape) => void;
  onToggleOutlines: () => void;
  onClearBlurStrokes: () => void;
  onBlurTypeChange: (nextType: BlurType) => void;
  onStrengthChange: (nextStrength: number) => void;
  onStrengthCommit: (nextStrength: number) => void;
  onRadiusChange: (value: number) => void;
  onAutoBlurEmails: () => void;
  onAutoBlurPhoneNumbers: () => void;
  onAutoBlurCustomText: (text: string) => void;
  onDeleteAutoBlurCustomText: (text: string) => void;
  savedAutoBlurCustomTexts: string[];
  isAutoBlurPending: boolean;
  autoBlurDisabled: boolean;
  autoBlurTooltip: string;
  autoBlurStatus?: string;
}

export function BlurSettingsSection({
  modeTooltip,
  blurTypeTooltip,
  outlinesTooltip,
  radiusTooltip,
  strengthTooltip,
  outlinesTogglePressed,
  outlinesForcedOn,
  showBlurOutlines,
  canEditBlurMode,
  canEditBlurType,
  canEditStrength,
  canEditRadius,
  blurStrokeShape,
  displayedBlurType,
  displayedStrength,
  brushRadius,
  onBlurStrokeShapeChange,
  onToggleOutlines,
  onClearBlurStrokes,
  onBlurTypeChange,
  onStrengthChange,
  onStrengthCommit,
  onRadiusChange,
  onAutoBlurEmails,
  onAutoBlurPhoneNumbers,
  onAutoBlurCustomText,
  onDeleteAutoBlurCustomText,
  savedAutoBlurCustomTexts,
  isAutoBlurPending,
  autoBlurDisabled,
  autoBlurTooltip,
  autoBlurStatus,
}: BlurSettingsSectionProps) {
  const [isAutoBlurMenuOpen, setIsAutoBlurMenuOpen] = useState(false);
  const [customText, setCustomText] = useState('');
  const autoBlurMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isAutoBlurMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!autoBlurMenuRef.current?.contains(event.target as Node)) {
        setIsAutoBlurMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAutoBlurMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isAutoBlurMenuOpen]);

  const handleAutoBlurEmails = () => {
    setIsAutoBlurMenuOpen(false);
    onAutoBlurEmails();
  };

  const handleAutoBlurPhoneNumbers = () => {
    setIsAutoBlurMenuOpen(false);
    onAutoBlurPhoneNumbers();
  };

  const handleAutoBlurCustomText = () => {
    const trimmed = customText.trim();
    if (!trimmed) return;

    setCustomText('');
    setIsAutoBlurMenuOpen(false);
    onAutoBlurCustomText(trimmed);
  };

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
          <div className="relative" ref={autoBlurMenuRef}>
            <ShortcutTooltip content={autoBlurTooltip}>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                aria-label="Open auto blur menu"
                aria-expanded={isAutoBlurMenuOpen}
                aria-haspopup="menu"
                onClick={() => setIsAutoBlurMenuOpen((value) => !value)}
                disabled={autoBlurDisabled}
                className="h-7 w-7">
                {isAutoBlurPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <AtSign className="h-3.5 w-3.5" />
                )}
              </Button>
            </ShortcutTooltip>

            {isAutoBlurMenuOpen ? (
              <div
                role="menu"
                className="bg-background border-border absolute right-0 z-20 mt-1 w-64 border-2 p-2 shadow-[3px_3px_0_0_rgba(0,0,0,0.68)]">
                <div className="space-y-1">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    aria-label="Auto blur email addresses"
                    disabled={isAutoBlurPending}
                    onClick={handleAutoBlurEmails}
                    className="h-8 w-full justify-start text-xs">
                    <AtSign className="h-3 w-3" />
                    Email addresses
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    aria-label="Auto blur phone numbers"
                    disabled={isAutoBlurPending}
                    onClick={handleAutoBlurPhoneNumbers}
                    className="h-8 w-full justify-start text-xs">
                    <Phone className="h-3 w-3" />
                    Phone numbers
                  </Button>
                </div>

                <div className="border-border mt-2 border-t pt-2">
                  <Label className="text-muted-foreground mb-1 block text-[11px]">
                    Custom text
                  </Label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={customText}
                      onChange={(event) => setCustomText(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          handleAutoBlurCustomText();
                        }
                      }}
                      placeholder="Enter text"
                      className="bg-secondary text-foreground border-border focus:ring-primary placeholder:text-muted-foreground h-8 min-w-0 flex-1 border-2 px-2 text-xs outline-none focus:ring-1"
                    />
                    <Button
                      type="button"
                      size="sm"
                      aria-label="Run auto blur for custom text"
                      disabled={isAutoBlurPending || !customText.trim()}
                      onClick={handleAutoBlurCustomText}
                      className="h-8 px-2 text-xs">
                      <Type className="h-3 w-3" />
                      Run
                    </Button>
                  </div>
                </div>

                <div className="mt-2 space-y-1">
                  {savedAutoBlurCustomTexts.length === 0 ? (
                    <p className="text-muted-foreground text-[10px]">No saved custom text yet.</p>
                  ) : (
                    savedAutoBlurCustomTexts.map((entry) => (
                      <div key={entry.toLowerCase()} className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Auto blur saved text ${entry}`}
                          disabled={isAutoBlurPending}
                          onClick={() => {
                            setIsAutoBlurMenuOpen(false);
                            onAutoBlurCustomText(entry);
                          }}
                          className="bg-secondary text-secondary-foreground hover:bg-secondary/80 h-7 min-w-0 flex-1 truncate rounded px-2 text-left text-[11px] disabled:cursor-not-allowed disabled:opacity-50">
                          {entry}
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete saved text ${entry}`}
                          onClick={() => onDeleteAutoBlurCustomText(entry)}
                          className="text-muted-foreground hover:text-destructive rounded p-1 transition-colors">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {autoBlurStatus ? (
        <p className="text-muted-foreground mb-3 text-[11px]">{autoBlurStatus}</p>
      ) : null}

      <div className="space-y-4">
        <div>
          <ShortcutTooltip content={modeTooltip}>
            <Label className="text-muted-foreground mb-2 block w-fit cursor-help text-xs">
              Mode
            </Label>
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

        <ShortcutTooltip content="Reset all blurs">
          <Button
            type="button"
            variant="secondary"
            aria-label="Reset all blurs"
            onClick={onClearBlurStrokes}
            className="h-8 w-full gap-1.5 text-xs">
            <Trash2 className="h-3.5 w-3.5" />
            Reset all blurs
          </Button>
        </ShortcutTooltip>
      </div>
    </div>
  );
}
