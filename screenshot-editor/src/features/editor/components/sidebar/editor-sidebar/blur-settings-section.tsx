import {Droplets, Eye, Trash2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import type {BlurStrokeShape, BlurType} from '@/features/editor/state/types';
import {ShortcutTooltip} from '@/features/editor/components/common/shortcut-tooltip';
import {AutoBlurMenu} from './auto-blur-menu';
import {BlurModeToggle} from './blur-mode-toggle';
import {BlurTypeToggle} from './blur-type-toggle';
import {LabeledSliderControl} from './labeled-slider-control';

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
  autoBlurStrength: number;
  onAutoBlurStrengthChange: (nextStrength: number) => void;
  autoBlurApplyOnLoadEmail: boolean;
  autoBlurApplyOnLoadPhone: boolean;
  isAutoBlurApplyOnLoadCustomText: (text: string) => boolean;
  onToggleAutoBlurApplyOnLoadEmail: () => void;
  onToggleAutoBlurApplyOnLoadPhone: () => void;
  onToggleAutoBlurApplyOnLoadCustomText: (text: string) => void;
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
  autoBlurStrength,
  onAutoBlurStrengthChange,
  autoBlurApplyOnLoadEmail,
  autoBlurApplyOnLoadPhone,
  isAutoBlurApplyOnLoadCustomText,
  onToggleAutoBlurApplyOnLoadEmail,
  onToggleAutoBlurApplyOnLoadPhone,
  onToggleAutoBlurApplyOnLoadCustomText,
  savedAutoBlurCustomTexts,
  isAutoBlurPending,
  autoBlurDisabled,
  autoBlurTooltip,
  autoBlurStatus,
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
          <AutoBlurMenu
            autoBlurTooltip={autoBlurTooltip}
            autoBlurDisabled={autoBlurDisabled}
            isAutoBlurPending={isAutoBlurPending}
            autoBlurStrength={autoBlurStrength}
            onAutoBlurStrengthChange={onAutoBlurStrengthChange}
            onAutoBlurEmails={onAutoBlurEmails}
            onAutoBlurPhoneNumbers={onAutoBlurPhoneNumbers}
            onAutoBlurCustomText={onAutoBlurCustomText}
            onDeleteAutoBlurCustomText={onDeleteAutoBlurCustomText}
            autoBlurApplyOnLoadEmail={autoBlurApplyOnLoadEmail}
            autoBlurApplyOnLoadPhone={autoBlurApplyOnLoadPhone}
            isAutoBlurApplyOnLoadCustomText={isAutoBlurApplyOnLoadCustomText}
            onToggleAutoBlurApplyOnLoadEmail={onToggleAutoBlurApplyOnLoadEmail}
            onToggleAutoBlurApplyOnLoadPhone={onToggleAutoBlurApplyOnLoadPhone}
            onToggleAutoBlurApplyOnLoadCustomText={onToggleAutoBlurApplyOnLoadCustomText}
            savedAutoBlurCustomTexts={savedAutoBlurCustomTexts}
          />
        </div>
      </div>

      {autoBlurStatus ? (
        <p className="text-muted-foreground mb-3 text-[11px]">{autoBlurStatus}</p>
      ) : null}

      <div className="space-y-4">
        <BlurModeToggle
          modeTooltip={modeTooltip}
          canEditBlurMode={canEditBlurMode}
          blurStrokeShape={blurStrokeShape}
          onBlurStrokeShapeChange={onBlurStrokeShapeChange}
        />

        <BlurTypeToggle
          blurTypeTooltip={blurTypeTooltip}
          canEditBlurType={canEditBlurType}
          displayedBlurType={displayedBlurType}
          onBlurTypeChange={onBlurTypeChange}
        />

        <LabeledSliderControl
          label="Strength"
          tooltip={strengthTooltip}
          valueText={String(displayedStrength)}
          value={displayedStrength}
          onValueChange={onStrengthChange}
          onValueCommit={onStrengthCommit}
          min={1}
          max={30}
          step={1}
          disabled={!canEditStrength}
        />

        <LabeledSliderControl
          label="Radius"
          tooltip={radiusTooltip}
          valueText={`${brushRadius}px`}
          value={brushRadius}
          onValueChange={onRadiusChange}
          min={5}
          max={100}
          step={1}
          disabled={!canEditRadius}
        />

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
