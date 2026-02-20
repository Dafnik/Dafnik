import {useCallback, useEffect, useRef, useState} from 'react';
import {AtSign, Check, Loader2, Phone, Type, X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Label} from '@/components/ui/label';
import {Slider} from '@/components/ui/slider';
import {ShortcutTooltip} from '@/features/editor/components/common/shortcut-tooltip';
import {OPEN_AUTO_BLUR_MENU_EVENT} from '@/features/editor/lib/keyboard';

interface AutoBlurMenuProps {
  autoBlurTooltip: string;
  autoBlurDisabled: boolean;
  isAutoBlurPending: boolean;
  autoBlurStrength: number;
  onAutoBlurStrengthChange: (nextStrength: number) => void;
  onAutoBlurEmails: () => void;
  onAutoBlurPhoneNumbers: () => void;
  onAutoBlurCustomText: (text: string) => void;
  onDeleteAutoBlurCustomText: (text: string) => void;
  autoBlurApplyOnLoadEmail: boolean;
  autoBlurApplyOnLoadPhone: boolean;
  isAutoBlurApplyOnLoadCustomText: (text: string) => boolean;
  onToggleAutoBlurApplyOnLoadEmail: () => void;
  onToggleAutoBlurApplyOnLoadPhone: () => void;
  onToggleAutoBlurApplyOnLoadCustomText: (text: string) => void;
  savedAutoBlurCustomTexts: string[];
}

export function AutoBlurMenu({
  autoBlurTooltip,
  autoBlurDisabled,
  isAutoBlurPending,
  autoBlurStrength,
  onAutoBlurStrengthChange,
  onAutoBlurEmails,
  onAutoBlurPhoneNumbers,
  onAutoBlurCustomText,
  onDeleteAutoBlurCustomText,
  autoBlurApplyOnLoadEmail,
  autoBlurApplyOnLoadPhone,
  isAutoBlurApplyOnLoadCustomText,
  onToggleAutoBlurApplyOnLoadEmail,
  onToggleAutoBlurApplyOnLoadPhone,
  onToggleAutoBlurApplyOnLoadCustomText,
  savedAutoBlurCustomTexts,
}: AutoBlurMenuProps) {
  const [isAutoBlurMenuOpen, setIsAutoBlurMenuOpen] = useState(false);
  const [customText, setCustomText] = useState('');
  const autoBlurMenuRef = useRef<HTMLDivElement | null>(null);
  const customTextInputRef = useRef<HTMLInputElement | null>(null);

  const focusCustomTextInput = () => {
    window.requestAnimationFrame(() => {
      customTextInputRef.current?.focus();
    });
  };

  const openAutoBlurMenuAndFocus = useCallback(() => {
    if (autoBlurDisabled) return;
    setIsAutoBlurMenuOpen(true);
    focusCustomTextInput();
  }, [autoBlurDisabled]);

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

  useEffect(() => {
    window.addEventListener(OPEN_AUTO_BLUR_MENU_EVENT, openAutoBlurMenuAndFocus);
    return () => window.removeEventListener(OPEN_AUTO_BLUR_MENU_EVENT, openAutoBlurMenuAndFocus);
  }, [openAutoBlurMenuAndFocus]);

  const renderApplyToggle = ({
    label,
    pressed,
    onToggle,
  }: {
    label: string;
    pressed: boolean;
    onToggle: () => void;
  }) => (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onToggle}
      className="border-border hover:bg-secondary/70 flex h-8 w-8 items-center justify-center border-2 transition-colors">
      <span
        className={`flex h-4 w-4 items-center justify-center border ${
          pressed
            ? 'bg-primary/15 border-primary text-primary'
            : 'border-border bg-background text-transparent'
        }`}>
        <Check className="h-3 w-3" />
      </span>
    </button>
  );

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
    <div className="flex items-center gap-1">
      <div className="relative" ref={autoBlurMenuRef}>
        <ShortcutTooltip content={autoBlurTooltip}>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Open auto blur menu"
            aria-expanded={isAutoBlurMenuOpen}
            aria-haspopup="menu"
            onClick={() =>
              setIsAutoBlurMenuOpen((value) => {
                const nextValue = !value;
                if (nextValue) {
                  focusCustomTextInput();
                }
                return nextValue;
              })
            }
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
            <div className="border-border mb-2 border-b pb-2">
              <div className="mb-1 flex items-center justify-between">
                <Label className="text-muted-foreground text-[11px]">Auto blur strength</Label>
                <span className="text-muted-foreground text-[11px] tabular-nums">
                  {autoBlurStrength}
                </span>
              </div>
              <Slider
                value={[autoBlurStrength]}
                onValueChange={([value]) => onAutoBlurStrengthChange(value)}
                min={1}
                max={30}
                step={1}
                disabled={isAutoBlurPending}
                className="w-full"
                aria-label="Auto blur strength"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  aria-label="Auto blur email addresses"
                  disabled={isAutoBlurPending}
                  onClick={handleAutoBlurEmails}
                  className="h-8 min-w-0 flex-1 justify-start text-xs">
                  <AtSign className="h-3 w-3" />
                  Email addresses
                </Button>
                {renderApplyToggle({
                  label: 'Apply email auto blur on document load',
                  pressed: autoBlurApplyOnLoadEmail,
                  onToggle: onToggleAutoBlurApplyOnLoadEmail,
                })}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  aria-label="Auto blur phone numbers"
                  disabled={isAutoBlurPending}
                  onClick={handleAutoBlurPhoneNumbers}
                  className="h-8 min-w-0 flex-1 justify-start text-xs">
                  <Phone className="h-3 w-3" />
                  Phone numbers
                </Button>
                {renderApplyToggle({
                  label: 'Apply phone auto blur on document load',
                  pressed: autoBlurApplyOnLoadPhone,
                  onToggle: onToggleAutoBlurApplyOnLoadPhone,
                })}
              </div>
            </div>

            <div className="border-border mt-2 border-t pt-2">
              <Label className="text-muted-foreground mb-1 block text-[11px]">Custom text</Label>
              <div className="flex gap-1">
                <input
                  ref={customTextInputRef}
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
                    {renderApplyToggle({
                      label: `Apply saved text ${entry} auto blur on document load`,
                      pressed: isAutoBlurApplyOnLoadCustomText(entry),
                      onToggle: () => onToggleAutoBlurApplyOnLoadCustomText(entry),
                    })}
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
  );
}
