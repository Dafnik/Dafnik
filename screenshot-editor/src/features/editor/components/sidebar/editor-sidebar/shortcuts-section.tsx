import {Keyboard} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {formatShortcutById} from '@/features/editor/lib/shortcut-definitions';
import {ShortcutTooltip} from './shortcut-tooltip';

interface ShortcutsSectionProps {
  shortcutsTooltip: string;
  onOpenShortcutsModal: () => void;
}

export function ShortcutsSection({shortcutsTooltip, onOpenShortcutsModal}: ShortcutsSectionProps) {
  return (
    <div className="mt-auto p-4">
      <ShortcutTooltip content={shortcutsTooltip}>
        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenShortcutsModal}
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
  );
}
