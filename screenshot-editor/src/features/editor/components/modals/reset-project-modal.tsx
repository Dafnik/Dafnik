import {useCallback, useEffect, useRef, useState} from 'react';
import {Check, X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {useEditorStore} from '@/features/editor/state/use-editor-store';
import {saveSkipResetProjectConfirmation} from '@/features/editor/state/reset-project-confirmation-storage';

export function ResetProjectModal() {
  const open = useEditorStore((state) => state.showResetProjectModal);
  const closeResetProjectModal = useEditorStore((state) => state.closeResetProjectModal);
  const resetProject = useEditorStore((state) => state.resetProject);
  const [skipNextTime, setSkipNextTime] = useState(false);
  const continueButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setSkipNextTime(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    window.requestAnimationFrame(() => {
      continueButtonRef.current?.focus();
    });
  }, [open]);

  const handleConfirm = useCallback(() => {
    if (skipNextTime) {
      saveSkipResetProjectConfirmation(true);
    }
    resetProject();
  }, [resetProject, skipNextTime]);

  useEffect(() => {
    if (!open) return;

    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeResetProjectModal();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeResetProjectModal, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeResetProjectModal}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            closeResetProjectModal();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Close reset project modal"
      />

      <div className="bg-card border-border relative w-[420px] max-w-[calc(100vw-2rem)] overflow-hidden border-4 shadow-[10px_10px_0_0_rgba(0,0,0,0.75)]">
        <div className="border-border flex items-center justify-between border-b-2 px-5 py-4">
          <h2 className="text-foreground text-sm font-semibold">Start a New Project?</h2>
          <button
            type="button"
            onClick={closeResetProjectModal}
            aria-label="Close reset project modal button"
            className="text-muted-foreground hover:text-foreground hover:bg-secondary border-border flex h-7 w-7 items-center justify-center border-2 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-5 py-5">
          <p className="text-muted-foreground text-sm">
            Any unsaved changes in the current project will be lost.
          </p>

          <button
            type="button"
            onClick={() => setSkipNextTime((value) => !value)}
            aria-pressed={skipNextTime}
            aria-label="Skip reset project confirmation next time"
            className="text-foreground flex items-center gap-2 text-left text-sm font-medium">
            <span
              className={`flex h-5 w-5 items-center justify-center border-2 ${
                skipNextTime
                  ? 'bg-primary/15 border-primary text-primary'
                  : 'border-border bg-background text-transparent'
              }`}>
              <Check className="h-3.5 w-3.5" />
            </span>
            Don't show this again
          </button>
        </div>

        <div className="border-border flex items-center justify-end gap-2 border-t-2 px-5 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={closeResetProjectModal}
            className="h-8 text-xs">
            Cancel
          </Button>
          <Button
            ref={continueButtonRef}
            size="sm"
            className="h-8 px-4 text-xs"
            onClick={handleConfirm}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
