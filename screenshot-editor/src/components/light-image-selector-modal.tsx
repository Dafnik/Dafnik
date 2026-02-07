import {useEffect} from 'react';
import {Button} from '@/components/ui/button';
import {X} from 'lucide-react';

interface LightImageSelectorModalProps {
  open: boolean;
  firstImage: string | null;
  secondImage: string | null;
  onSelectFirst: () => void;
  onSelectSecond: () => void;
  onCancel: () => void;
}

export function LightImageSelectorModal({
  open,
  firstImage,
  secondImage,
  onSelectFirst,
  onSelectSecond,
  onCancel,
}: LightImageSelectorModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open || !firstImage || !secondImage) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onCancel();
        }}
        role="button"
        tabIndex={0}
        aria-label="Close light image selector modal"
      />

      <div className="bg-card border-border relative w-[900px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border shadow-2xl">
        <div className="border-border flex items-center justify-between border-b px-5 py-4">
          <div className="flex flex-col">
            <h2 className="text-foreground text-sm font-semibold">Select Light Mode Screenshot</h2>
            <p className="text-muted-foreground mt-1 text-xs">
              Select which screenshot is the light mode image.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground hover:bg-secondary flex h-7 w-7 items-center justify-center rounded-md transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
          <button
            type="button"
            onClick={onSelectFirst}
            aria-label="Use first uploaded image as light screenshot"
            className="border-border bg-secondary/30 hover:border-primary hover:bg-secondary/50 overflow-hidden rounded-lg border text-left transition-colors">
            <img
              src={firstImage}
              alt="First uploaded screenshot"
              className="max-h-[50vh] w-full object-contain"
            />
            <div className="border-border flex items-center justify-between border-t px-3 py-2">
              <span className="text-muted-foreground text-xs">First uploaded image</span>
              <span className="text-primary text-xs font-medium">Click to use as Light</span>
            </div>
          </button>

          <button
            type="button"
            onClick={onSelectSecond}
            aria-label="Use second uploaded image as light screenshot"
            className="border-border bg-secondary/30 hover:border-primary hover:bg-secondary/50 overflow-hidden rounded-lg border text-left transition-colors">
            <img
              src={secondImage}
              alt="Second uploaded screenshot"
              className="max-h-[50vh] w-full object-contain"
            />
            <div className="border-border flex items-center justify-between border-t px-3 py-2">
              <span className="text-muted-foreground text-xs">Second uploaded image</span>
              <span className="text-primary text-xs font-medium">Click to use as Light</span>
            </div>
          </button>
        </div>

        <div className="border-border flex items-center justify-end border-t px-5 py-4">
          <Button variant="ghost" size="sm" onClick={onCancel} className="h-8 text-xs">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
