import {useEffect} from 'react';
import {X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {useEditorStore} from '@/features/editor/state/use-editor-store';

const SHORTCUT_ROWS = [
  {label: 'Shortcuts', keys: 'Ctrl+/'},
  {label: 'Undo', keys: 'Ctrl+Z'},
  {label: 'Redo', keys: 'Ctrl+Y'},
  {label: 'Pan', keys: 'Alt+Drag'},
  {label: 'Zoom', keys: 'Scroll'},
  {label: 'Zoom +/-', keys: 'Ctrl+←/→'},
  {label: 'Export', keys: 'Ctrl+E'},
  {label: 'New project', keys: 'Ctrl+N'},
  {label: 'Switch tool', keys: 'Ctrl+T'},
  {label: 'Toggle blur type', keys: 'Ctrl+B'},
  {label: 'Cycle split direction', keys: 'Ctrl+D'},
  {label: 'Toggle outlines', keys: 'Ctrl+O'},
  {label: 'Radius +/-', keys: 'Ctrl+R+←/→/J/K'},
  {label: 'Strength +/-', keys: 'Ctrl+S+←/→/J/K'},
];

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
          {SHORTCUT_ROWS.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{row.label}</span>
              <kbd className="bg-secondary text-secondary-foreground rounded px-1.5 py-0.5 font-mono">
                {row.keys}
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
