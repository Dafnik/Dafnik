import {useEffect} from 'react';
import {X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {EDITOR_SHORTCUTS, formatShortcutKeys} from '@/features/editor/lib/shortcut-definitions';
import {useEditorStore} from '@/features/editor/state/use-editor-store';

export function ShortcutsModal() {
  const open = useEditorStore((state) => state.showShortcutsModal);
  const closeShortcutsModal = useEditorStore((state) => state.closeShortcutsModal);

  useEffect(() => {
    if (!open) return;

    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeShortcutsModal();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeShortcutsModal, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeShortcutsModal}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            closeShortcutsModal();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Close shortcuts modal"
      />

      <div className="bg-card border-border relative w-[420px] max-w-[calc(100vw-2rem)] overflow-hidden border-4 shadow-[10px_10px_0_0_rgba(0,0,0,0.75)]">
        <div className="border-border flex items-center justify-between border-b-2 px-5 py-4">
          <h2 className="text-foreground text-sm font-semibold">Keyboard Shortcuts</h2>
          <button
            type="button"
            onClick={closeShortcutsModal}
            aria-label="Close shortcuts modal button"
            className="text-muted-foreground hover:text-foreground hover:bg-secondary border-border flex h-7 w-7 items-center justify-center border-2 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-1 px-5 py-4 text-xs">
          {EDITOR_SHORTCUTS.map((shortcut) => (
            <div key={shortcut.id} className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{shortcut.label}</span>
              <kbd className="bg-secondary text-secondary-foreground rounded px-1.5 py-0.5 font-mono">
                {formatShortcutKeys(shortcut.keys)}
              </kbd>
            </div>
          ))}
        </div>

        <div className="border-border flex items-center justify-end border-t-2 px-5 py-4">
          <Button variant="ghost" size="sm" onClick={closeShortcutsModal} className="h-8 text-xs">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
