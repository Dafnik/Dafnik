import {Button} from '@/components/ui/button';
import {LibraryPairCard} from '@/features/library/components/library-pair-card';
import type {LibraryPair, ReviewItem} from '@/features/library/types';
import {Check, Eye, Trash2, X} from 'lucide-react';

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
        <LibraryPairCard
          key={item.id}
          pair={item.pair}
          reasonLabel="borderline"
          actions={
            <>
              <Button size="sm" onClick={() => onAccept(item.id)}>
                <Check className="h-3.5 w-3.5" />
                Accept pair
              </Button>
              <Button variant="outline" size="sm" onClick={() => onReject(item.id)}>
                <X className="h-3.5 w-3.5" />
                Reject
              </Button>
              <Button variant="outline" size="sm" onClick={() => onDeleteImages(item.id)}>
                <Trash2 className="h-3.5 w-3.5" />
                Delete images
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onOpenPair(item.pair)}>
                <Eye className="h-3.5 w-3.5" />
                Open preview
              </Button>
            </>
          }
        />
      ))}
    </div>
  );
}
