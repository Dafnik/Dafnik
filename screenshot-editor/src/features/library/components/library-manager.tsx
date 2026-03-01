import {useMemo, useRef} from 'react';
import {Button} from '@/components/ui/button';
import {Slider} from '@/components/ui/slider';
import {LibraryPairCard} from '@/features/library/components/library-pair-card';
import {ReviewQueue} from '@/features/library/components/review-queue';
import type {LibraryImage, LibraryPair, LibrarySession} from '@/features/library/types';
import {
  AlertTriangle,
  CheckCircle2,
  FolderOpen,
  ImageOff,
  Link2,
  Loader2,
  Trash2,
  Unlink2,
  Upload,
} from 'lucide-react';

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
  autoMatchThresholdPercent: number;
  onAutoMatchThresholdPercentChange: (nextPercent: number) => void;
  errorMessage?: string | null;
  onDismissError?: () => void;
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
  autoMatchThresholdPercent,
  onAutoMatchThresholdPercentChange,
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
    <div className="bg-background h-screen w-screen overflow-y-auto px-5 py-5">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="border-border bg-card flex flex-wrap items-start justify-between gap-3 border-2 p-4">
          <div className="space-y-2">
            <h1 className="text-foreground text-lg font-semibold">Screenshot Library</h1>
            <div className="flex flex-wrap items-end gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => addScreenshotsInputRef.current?.click()}
                disabled={isAppendingScreenshots}>
                <Upload className="h-3.5 w-3.5" />
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
                <Trash2 className="h-3.5 w-3.5" />
                Clear library
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="border-border bg-secondary/40 flex items-center gap-1.5 border px-2 py-1">
                <Link2 className="h-3.5 w-3.5" />
                Active: {activePairs.length}
              </span>
              <span className="border-border bg-secondary/40 flex items-center gap-1.5 border px-2 py-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Done: {donePairs.length}
              </span>
              <span className="border-border bg-secondary/40 flex items-center gap-1.5 border px-2 py-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                Review: {session.reviewPairs.length}
              </span>
              <span className="border-border bg-secondary/40 flex items-center gap-1.5 border px-2 py-1">
                <ImageOff className="h-3.5 w-3.5" />
                Unmatched: {unmatchedImages.length}
              </span>
              {appendProgress ? (
                <span className="border-border bg-secondary/40 flex items-center gap-1.5 border px-2 py-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Adding screenshots: {appendProgress.processed}/{appendProgress.total}
                </span>
              ) : null}
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold tracking-wide uppercase">
                  Manual review threshold
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {autoMatchThresholdPercent}%
                </span>
              </div>
              <Slider
                aria-label="Manual review threshold percentage"
                min={72}
                max={100}
                step={1}
                value={[autoMatchThresholdPercent]}
                onValueChange={(values) => {
                  const nextValue = values[0];
                  if (typeof nextValue === 'number') {
                    onAutoMatchThresholdPercentChange(nextValue);
                  }
                }}
              />
            </div>
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
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
            <Link2 className="h-4 w-4" />
            Active Pairs
          </h2>
          {activePairs.length === 0 ? (
            <div className="border-border bg-card border-2 p-4">
              <p className="text-muted-foreground text-sm">No active pairs.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {activePairs.map((pair) => (
                <LibraryPairCard
                  key={pair.id}
                  pair={pair}
                  reasonLabel={pair.reason}
                  actions={
                    <>
                      <Button size="sm" onClick={() => onOpenPair(pair)}>
                        <FolderOpen className="h-3.5 w-3.5" />
                        Open pair
                      </Button>
                      {onUnpairPair ? (
                        <Button variant="outline" size="sm" onClick={() => onUnpairPair(pair.id)}>
                          <Unlink2 className="h-3.5 w-3.5" />
                          Unpair
                        </Button>
                      ) : null}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDeletePairImages(pair.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete images
                      </Button>
                    </>
                  }
                />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
            <AlertTriangle className="h-4 w-4" />
            Needs Review
          </h2>
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
            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
              <ImageOff className="h-4 w-4" />
              Unmatched
            </h2>
            <Button
              size="sm"
              variant="secondary"
              onClick={onCreateManualPair}
              disabled={selectedUnmatchedImageIds.length !== 2}>
              <Link2 className="h-3.5 w-3.5" />
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
                        <Trash2 className="h-3.5 w-3.5" />
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
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
            <CheckCircle2 className="h-4 w-4" />
            Done
          </h2>
          {donePairs.length === 0 ? (
            <div className="border-border bg-card border-2 p-4">
              <p className="text-muted-foreground text-sm">No completed pairs yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {donePairs.map((pair) => (
                <LibraryPairCard
                  key={pair.id}
                  pair={pair}
                  reasonLabel={pair.reason}
                  actions={
                    <>
                      <Button size="sm" onClick={() => onOpenPair(pair)}>
                        <FolderOpen className="h-3.5 w-3.5" />
                        Open pair
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDeletePairImages(pair.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete images
                      </Button>
                    </>
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
