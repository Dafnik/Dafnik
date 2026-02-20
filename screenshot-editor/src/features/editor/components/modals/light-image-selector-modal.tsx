import {X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {ModalShell} from '@/features/editor/components/modals/modal-shell';
import {useCloseOnEscape} from '@/features/editor/hooks/use-close-on-escape';
import {useEditorStore} from '@/features/editor/state/use-editor-store';

interface LightImageSelectorModalProps {
  onSelectFirst: () => void;
  onSelectSecond: () => void;
  onCancel: () => void;
}

export function LightImageSelectorModal({
  onSelectFirst,
  onSelectSecond,
  onCancel,
}: LightImageSelectorModalProps) {
  const open = useEditorStore((state) => state.showLightSelectorModal);
  const firstImage = useEditorStore((state) => state.selectorFirstImage);
  const secondImage = useEditorStore((state) => state.selectorSecondImage);
  useCloseOnEscape(open, onCancel);

  if (!open || !firstImage || !secondImage) return null;

  return (
    <ModalShell
      onClose={onCancel}
      overlayAriaLabel="Close light image selector modal"
      containerClassName="w-[900px] max-w-[calc(100vw-2rem)]">
      <div>
        <div className="border-border flex items-center justify-between border-b-2 px-5 py-4">
          <div className="flex flex-col">
            <h2 className="text-foreground text-sm font-semibold">Select Light Mode Screenshot</h2>
            <p className="text-muted-foreground mt-1 text-xs">
              Select which screenshot is the light mode image.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground hover:bg-secondary border-border flex h-7 w-7 items-center justify-center border-2 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
          <button
            type="button"
            onClick={onSelectFirst}
            aria-label="Use first uploaded image as light screenshot"
            className="border-border bg-secondary/30 hover:border-primary hover:bg-secondary/50 overflow-hidden border-2 text-left shadow-[4px_4px_0_0_rgba(0,0,0,0.7)] transition-colors">
            <img
              src={firstImage}
              alt="First uploaded screenshot"
              className="max-h-[50vh] w-full object-contain"
            />
            <div className="border-border flex items-center justify-between border-t-2 px-3 py-2">
              <span className="text-muted-foreground text-xs">First uploaded image</span>
              <span className="text-primary text-xs font-medium">Click to use as Light</span>
            </div>
          </button>

          <button
            type="button"
            onClick={onSelectSecond}
            aria-label="Use second uploaded image as light screenshot"
            className="border-border bg-secondary/30 hover:border-primary hover:bg-secondary/50 overflow-hidden border-2 text-left shadow-[4px_4px_0_0_rgba(0,0,0,0.7)] transition-colors">
            <img
              src={secondImage}
              alt="Second uploaded screenshot"
              className="max-h-[50vh] w-full object-contain"
            />
            <div className="border-border flex items-center justify-between border-t-2 px-3 py-2">
              <span className="text-muted-foreground text-xs">Second uploaded image</span>
              <span className="text-primary text-xs font-medium">Click to use as Light</span>
            </div>
          </button>
        </div>

        <div className="border-border flex items-center justify-end border-t-2 px-5 py-4">
          <Button variant="ghost" size="sm" onClick={onCancel} className="h-8 text-xs">
            Cancel
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
