import {useEffect} from 'react';
import {X} from 'lucide-react';
import {Button} from '@/components/ui/button';
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

  useEffect(() => {
    if (!open) return;

    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel, open]);

  if (!open || !firstImage || !secondImage) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') onCancel();
        }}
        role="button"
        tabIndex={0}
        aria-label="Close light image selector modal"
      />

      <div className="bg-card border-border relative w-[900px] max-w-[calc(100vw-2rem)] overflow-hidden border-4 shadow-[10px_10px_0_0_rgba(0,0,0,0.75)]">
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
    </div>
  );
}
