import {useMemo, useRef} from 'react';
import {Button} from '@/components/ui/button';
import {ReviewQueue} from '@/features/library/components/review-queue';
import type {LibraryImage, LibraryPair, LibrarySession} from '@/features/library/types';

interface LibraryManagerProps {
  session: LibrarySession;
  selectedUnmatchedImageIds: string[];
  onSelectUnmatchedImage: (imageId: string) => void;
  onCreateManualPair: () => void;
  onOpenPair: (pair: LibraryPair) => void;
  onUnpairPair: (pairId: string) => void;
  onDeletePairImages: (pairId: string) => void;
  onAcceptReview: (itemId: string) => void;
  onRejectReview: (itemId: string) => void;
  onDeleteReviewImages: (itemId: string) => void;
  onDeleteUnmatchedImage: (imageId: string) => void;
  onClearLibrary: () => void;
  onAddScreenshots: (files: File[]) => void;
  isAppendingScreenshots: boolean;
  appendProgress?: {processed: number; total: number} | null;
  errorMessage?: string | null;
  onDismissError?: () => void;
}

function PairCard({
  pair,
  onOpenPair,
  onDeletePairImages,
  onUnpairPair,
}: {
  pair: LibraryPair;
  onOpenPair: (pair: LibraryPair) => void;
  onDeletePairImages: (pairId: string) => void;
  onUnpairPair?: (pairId: string) => void;
}) {
  return (
    <article key={pair.id} className="border-border bg-card border-2 p-3">
      <header className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide uppercase">{pair.reason}</span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {Math.round(pair.score * 100)}%
        </span>
      </header>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <figure className="border-border bg-secondary/30 border p-1">
          <img
            src={pair.darkImage.dataUrl}
            alt={`${pair.darkImage.fileName} dark preview`}
            className="h-32 w-full object-contain"
          />
          <figcaption className="text-muted-foreground mt-1 truncate text-[11px]">
            Dark: {pair.darkImage.fileName}
          </figcaption>
        </figure>
        <figure className="border-border bg-secondary/30 border p-1">
          <img
            src={pair.lightImage.dataUrl}
            alt={`${pair.lightImage.fileName} light preview`}
            className="h-32 w-full object-contain"
          />
          <figcaption className="text-muted-foreground mt-1 truncate text-[11px]">
            Light: {pair.lightImage.fileName}
          </figcaption>
        </figure>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => onOpenPair(pair)}>
          Open pair
        </Button>
        {onUnpairPair ? (
          <Button variant="outline" size="sm" onClick={() => onUnpairPair(pair.id)}>
            Unpair
          </Button>
        ) : null}
        <Button variant="outline" size="sm" onClick={() => onDeletePairImages(pair.id)}>
          Delete images
        </Button>
      </div>
    </article>
  );
}

export function LibraryManager({
  session,
  selectedUnmatchedImageIds,
  onSelectUnmatchedImage,
  onCreateManualPair,
  onOpenPair,
  onUnpairPair,
  onDeletePairImages,
  onAcceptReview,
  onRejectReview,
  onDeleteReviewImages,
  onDeleteUnmatchedImage,
  onClearLibrary,
  onAddScreenshots,
  isAppendingScreenshots,
  appendProgress,
  errorMessage,
  onDismissError,
}: LibraryManagerProps) {
  const addScreenshotsInputRef = useRef<HTMLInputElement | null>(null);
  const imagesById = useMemo(
    () => new Map(session.images.map((image) => [image.id, image])),
    [session.images],
  );

  const activePairs = useMemo(
    () => session.pairs.filter((pair) => pair.completedAt === null),
    [session.pairs],
  );
  const donePairs = useMemo(
    () => session.pairs.filter((pair) => pair.completedAt !== null),
    [session.pairs],
  );
  const unmatchedImages = useMemo(
    () =>
      session.unmatchedImageIds
        .map((imageId) => imagesById.get(imageId))
        .filter((image): image is LibraryImage => Boolean(image)),
    [imagesById, session.unmatchedImageIds],
  );

  return (
    <div className="bg-background min-h-screen w-screen overflow-auto px-5 py-5">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="border-border bg-card flex flex-wrap items-center justify-between gap-3 border-2 p-4">
          <div>
            <h1 className="text-foreground text-lg font-semibold">Screenshot Library Pairing</h1>
            <p className="text-muted-foreground text-sm">
              Auto-grouped pairs are ready. Borderline pairs stay in review.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="border-border bg-secondary/40 border px-2 py-1">
              Active: {activePairs.length}
            </span>
            <span className="border-border bg-secondary/40 border px-2 py-1">
              Done: {donePairs.length}
            </span>
            <span className="border-border bg-secondary/40 border px-2 py-1">
              Review: {session.reviewPairs.length}
            </span>
            <span className="border-border bg-secondary/40 border px-2 py-1">
              Unmatched: {unmatchedImages.length}
            </span>
            {appendProgress ? (
              <span className="border-border bg-secondary/40 border px-2 py-1">
                Adding screenshots: {appendProgress.processed}/{appendProgress.total}
              </span>
            ) : null}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => addScreenshotsInputRef.current?.click()}
              disabled={isAppendingScreenshots}>
              Add screenshots
            </Button>
            <input
              ref={addScreenshotsInputRef}
              data-testid="library-add-screenshots-input"
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                if (!event.target.files) return;
                onAddScreenshots(Array.from(event.target.files));
                event.currentTarget.value = '';
              }}
            />
            <Button variant="ghost" size="sm" onClick={onClearLibrary}>
              Clear library
            </Button>
          </div>
        </header>

        {errorMessage ? (
          <div className="border-destructive/60 bg-destructive/10 mt-3 flex items-center justify-between border-2 px-3 py-2">
            <p className="text-sm">{errorMessage}</p>
            {onDismissError ? (
              <Button variant="ghost" size="sm" onClick={onDismissError}>
                Dismiss
              </Button>
            ) : null}
          </div>
        ) : null}

        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide uppercase">Active Pairs</h2>
          {activePairs.length === 0 ? (
            <div className="border-border bg-card border-2 p-4">
              <p className="text-muted-foreground text-sm">No active pairs.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {activePairs.map((pair) => (
                <PairCard
                  key={pair.id}
                  pair={pair}
                  onOpenPair={onOpenPair}
                  onDeletePairImages={onDeletePairImages}
                  onUnpairPair={onUnpairPair}
                />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide uppercase">Needs Review</h2>
          <ReviewQueue
            items={session.reviewPairs}
            onAccept={onAcceptReview}
            onReject={onRejectReview}
            onDeleteImages={onDeleteReviewImages}
            onOpenPair={onOpenPair}
          />
        </section>

        <section className="space-y-3 pb-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold tracking-wide uppercase">Unmatched</h2>
            <Button
              size="sm"
              variant="secondary"
              onClick={onCreateManualPair}
              disabled={selectedUnmatchedImageIds.length !== 2}>
              Create manual pair
            </Button>
          </div>
          {unmatchedImages.length === 0 ? (
            <div className="border-border bg-card border-2 p-4">
              <p className="text-muted-foreground text-sm">No unmatched screenshots.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
              {unmatchedImages.map((image) => {
                const selected = selectedUnmatchedImageIds.includes(image.id);

                return (
                  <div
                    key={image.id}
                    className={`border-border bg-card relative border-2 p-2 text-left transition-all ${
                      selected
                        ? 'border-primary bg-primary/15 ring-primary/45 shadow-[6px_6px_0_0_rgba(0,0,0,0.75)] ring-4'
                        : 'hover:bg-secondary/30'
                    }`}>
                    <button
                      type="button"
                      onClick={() => onSelectUnmatchedImage(image.id)}
                      aria-label={`Select unmatched image ${image.fileName}`}
                      className="w-full text-left">
                      {selected ? (
                        <span className="bg-primary text-primary-foreground absolute top-1 left-1 z-10 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                          Selected
                        </span>
                      ) : null}
                      <img
                        src={image.dataUrl}
                        alt={`${image.fileName} unmatched screenshot`}
                        className="h-28 w-full object-contain"
                      />
                      <div className="mt-1 text-[11px]">
                        <p className="text-muted-foreground truncate">{image.fileName}</p>
                        <p className="text-muted-foreground">no viable match</p>
                      </div>
                    </button>
                    <div className="mt-2 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px]"
                        onClick={() => onDeleteUnmatchedImage(image.id)}>
                        Delete image
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-3 pb-8">
          <h2 className="text-sm font-semibold tracking-wide uppercase">Done</h2>
          {donePairs.length === 0 ? (
            <div className="border-border bg-card border-2 p-4">
              <p className="text-muted-foreground text-sm">No completed pairs yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {donePairs.map((pair) => (
                <PairCard
                  key={pair.id}
                  pair={pair}
                  onOpenPair={onOpenPair}
                  onDeletePairImages={onDeletePairImages}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
