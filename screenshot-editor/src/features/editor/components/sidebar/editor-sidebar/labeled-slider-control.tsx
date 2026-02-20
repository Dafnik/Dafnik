import {Label} from '@/components/ui/label';
import {Slider} from '@/components/ui/slider';
import {ShortcutTooltip} from '@/features/editor/components/common/shortcut-tooltip';

interface LabeledSliderControlProps {
  label: string;
  tooltip: string;
  valueText: string;
  value: number;
  onValueChange: (value: number) => void;
  onValueCommit?: (value: number) => void;
  min: number;
  max: number;
  step: number;
  disabled: boolean;
}

export function LabeledSliderControl({
  label,
  tooltip,
  valueText,
  value,
  onValueChange,
  onValueCommit,
  min,
  max,
  step,
  disabled,
}: LabeledSliderControlProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <ShortcutTooltip content={tooltip}>
          <Label
            className={`text-xs ${disabled ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
            {label}
          </Label>
        </ShortcutTooltip>
        <span
          className={`text-xs tabular-nums ${disabled ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
          {valueText}
        </span>
      </div>
      <ShortcutTooltip content={tooltip}>
        <div
          className={`rounded-md px-1 py-1 transition-opacity ${
            disabled ? 'bg-muted/35 border-border/70 border border-dashed opacity-55' : ''
          }`}>
          <Slider
            value={[value]}
            onValueChange={([next]) => onValueChange(next)}
            onValueCommit={onValueCommit ? ([next]) => onValueCommit(next) : undefined}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            className="w-full"
          />
        </div>
      </ShortcutTooltip>
    </div>
  );
}
