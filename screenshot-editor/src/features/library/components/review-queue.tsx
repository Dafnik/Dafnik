import {Button} from '@/components/ui/button';
import type {LibraryPair, ReviewItem} from '@/features/library/types';

interface ReviewQueueProps {
  items: ReviewItem[];
  onAccept: (itemId: string) => void;
  onReject: (itemId: string) => void;
  onDeleteImages: (itemId: string) => void;
  onOpenPair: (pair: LibraryPair) => void;
}

export function ReviewQueue({
  items,
  onAccept,
  onReject,
  onDeleteImages,
  onOpenPair,
}: ReviewQueueProps) {
  if (items.length === 0) {
    return (
      <div className="border-border bg-card border-2 p-4">
        <p className="text-muted-foreground text-sm">No review items pending.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {items.map((item) => (
        <article key={item.id} className="border-border bg-card border-2 p-3">
          <header className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wide uppercase">borderline</span>
            <span className="text-muted-foreground text-xs tabular-nums">
              {Math.round(item.pair.score * 100)}%
            </span>
          </header>

          <div className="mb-3 grid grid-cols-2 gap-2">
            <figure className="border-border bg-secondary/30 border p-1">
              <img
                src={item.pair.darkImage.dataUrl}
                alt={`${item.pair.darkImage.fileName} dark preview`}
                className="h-32 w-full object-contain"
              />
              <figcaption className="text-muted-foreground mt-1 truncate text-[11px]">
                Dark: {item.pair.darkImage.fileName}
              </figcaption>
            </figure>

            <figure className="border-border bg-secondary/30 border p-1">
              <img
                src={item.pair.lightImage.dataUrl}
                alt={`${item.pair.lightImage.fileName} light preview`}
                className="h-32 w-full object-contain"
              />
              <figcaption className="text-muted-foreground mt-1 truncate text-[11px]">
                Light: {item.pair.lightImage.fileName}
              </figcaption>
            </figure>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => onAccept(item.id)}>
              Accept pair
            </Button>
            <Button variant="outline" size="sm" onClick={() => onReject(item.id)}>
              Reject
            </Button>
            <Button variant="outline" size="sm" onClick={() => onDeleteImages(item.id)}>
              Delete images
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onOpenPair(item.pair)}>
              Open preview
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
