import {useEffect} from 'react';
import {X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {
  EDITOR_SHORTCUTS,
  formatShortcutKeys,
  type ShortcutId,
} from '@/features/editor/lib/shortcut-definitions';
import {useEditorStore} from '@/features/editor/state/use-editor-store';

const SHORTCUT_GROUPS: Array<{title: string; shortcutIds: ShortcutId[]}> = [
  {
    title: 'General',
    shortcutIds: ['shortcuts-modal', 'undo', 'redo', 'open-upload-dialog', 'export', 'new-project'],
  },
  {
    title: 'Editor',
    shortcutIds: ['pan', 'zoom', 'zoom-step', 'switch-tool', 'copy-selection', 'paste-selection'],
  },
  {
    title: 'Blur',
    shortcutIds: [
      'toggle-blur-type',
      'open-auto-blur-menu',
      'toggle-outlines',
      'radius-step',
      'strength-step',
      'load-template-slot',
    ],
  },
  {
    title: 'Split',
    shortcutIds: ['cycle-split-direction', 'toggle-split-placement'],
  },
];

export function ShortcutsModal() {
  const open = useEditorStore((state) => state.showShortcutsModal);
  const closeShortcutsModal = useEditorStore((state) => state.closeShortcutsModal);
  const shortcutsById = new Map(EDITOR_SHORTCUTS.map((shortcut) => [shortcut.id, shortcut]));

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

        <div className="space-y-4 px-5 py-4 text-xs">
          {SHORTCUT_GROUPS.map((group) => {
            const shortcuts = group.shortcutIds
              .map((shortcutId) => shortcutsById.get(shortcutId))
              .filter((shortcut): shortcut is (typeof EDITOR_SHORTCUTS)[number] => !!shortcut);

            if (shortcuts.length === 0) return null;

            return (
              <section key={group.title} className="space-y-1.5">
                <h3 className="text-foreground text-[11px] font-semibold tracking-wide uppercase">
                  {group.title}
                </h3>
                {shortcuts.map((shortcut) => (
                  <div key={shortcut.id} className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">{shortcut.label}</span>
                    <kbd className="bg-secondary text-secondary-foreground rounded px-1.5 py-0.5 font-mono">
                      {formatShortcutKeys(shortcut.keys)}
                    </kbd>
                  </div>
                ))}
              </section>
            );
          })}
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
