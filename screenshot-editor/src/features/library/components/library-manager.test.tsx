import {render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it, vi} from 'vitest';
import {LibraryManager} from '@/features/library/components/library-manager';
import type {LibraryImage, LibraryPair, LibrarySession} from '@/features/library/types';

function makeImage(id: string, fileName: string, meanLuminance: number): LibraryImage {
  return {
    id,
    fileName,
    dataUrl: `data:${id}`,
    features: {
      width: 1200,
      height: 800,
      aspectRatio: 1.5,
      meanLuminance,
      grayscaleThumbnail: new Uint8ClampedArray(96 * 96),
      edgeMap: new Uint8ClampedArray(96 * 96),
      edgeHash: new Uint8Array(32),
    },
  };
}

function makePair(id: string, darkImage: LibraryImage, lightImage: LibraryImage): LibraryPair {
  return {
    id,
    darkImage,
    lightImage,
    score: 0.91,
    status: 'auto',
    reason: 'high match',
    completedAt: null,
  };
}

function buildSession(): LibrarySession {
  const activeDark = makeImage('active-dark', 'active-dark.png', 20);
  const activeLight = makeImage('active-light', 'active-light.png', 220);
  const doneDark = makeImage('done-dark', 'done-dark.png', 30);
  const doneLight = makeImage('done-light', 'done-light.png', 210);
  const reviewDark = makeImage('review-dark', 'review-dark.png', 35);
  const reviewLight = makeImage('review-light', 'review-light.png', 180);
  const unmatchedOne = makeImage('unmatched-1', 'unmatched-1.png', 60);
  const unmatchedTwo = makeImage('unmatched-2', 'unmatched-2.png', 170);

  const activePair = makePair('active-dark__active-light', activeDark, activeLight);
  const donePair = {
    ...makePair('done-dark__done-light', doneDark, doneLight),
    completedAt: '2026-01-01',
  };
  const reviewPair: LibraryPair = {
    id: 'review-dark__review-light',
    darkImage: reviewDark,
    lightImage: reviewLight,
    score: 0.75,
    status: 'auto',
    reason: 'borderline',
    completedAt: null,
  };

  return {
    images: [
      activeDark,
      activeLight,
      doneDark,
      doneLight,
      reviewDark,
      reviewLight,
      unmatchedOne,
      unmatchedTwo,
    ],
    pairs: [activePair, donePair],
    reviewPairs: [{id: reviewPair.id, pair: reviewPair, reason: 'borderline'}],
    unmatchedImageIds: [unmatchedOne.id, unmatchedTwo.id],
  };
}

function renderLibrary(selectedUnmatchedImageIds: string[] = []) {
  return render(
    <LibraryManager
      session={buildSession()}
      selectedUnmatchedImageIds={selectedUnmatchedImageIds}
      onSelectUnmatchedImage={() => {}}
      onCreateManualPair={() => {}}
      onOpenPair={() => {}}
      onUnpairPair={() => {}}
      onDeletePairImages={() => {}}
      onAcceptReview={() => {}}
      onRejectReview={() => {}}
      onDeleteReviewImages={() => {}}
      onDeleteUnmatchedImage={() => {}}
      onAddScreenshots={() => {}}
      isAppendingScreenshots={false}
      appendProgress={null}
      onClearLibrary={() => {}}
    />,
  );
}

describe('LibraryManager', () => {
  it('shows active and done sections with separate pair counts', () => {
    renderLibrary();

    expect(screen.getByText('Active: 1')).toBeInTheDocument();
    expect(screen.getByText('Done: 1')).toBeInTheDocument();
    expect(screen.getByText('Review: 1')).toBeInTheDocument();
    expect(screen.getByText('Unmatched: 2')).toBeInTheDocument();
    expect(screen.getByText('Active Pairs')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('invokes pair and review action callbacks', async () => {
    const user = userEvent.setup();
    const onOpenPair = vi.fn();
    const onUnpairPair = vi.fn();
    const onDeletePairImages = vi.fn();
    const onAcceptReview = vi.fn();
    const onRejectReview = vi.fn();
    const onDeleteReviewImages = vi.fn();

    render(
      <LibraryManager
        session={buildSession()}
        selectedUnmatchedImageIds={[]}
        onSelectUnmatchedImage={() => {}}
        onCreateManualPair={() => {}}
        onOpenPair={onOpenPair}
        onUnpairPair={onUnpairPair}
        onDeletePairImages={onDeletePairImages}
        onAcceptReview={onAcceptReview}
        onRejectReview={onRejectReview}
        onDeleteReviewImages={onDeleteReviewImages}
        onDeleteUnmatchedImage={() => {}}
        onAddScreenshots={() => {}}
        isAppendingScreenshots={false}
        appendProgress={null}
        onClearLibrary={() => {}}
      />,
    );

    await user.click(screen.getAllByRole('button', {name: 'Open pair'})[0]);
    expect(onOpenPair).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', {name: 'Unpair'}));
    expect(onUnpairPair).toHaveBeenCalledWith('active-dark__active-light');

    await user.click(screen.getAllByRole('button', {name: 'Delete images'})[0]);
    expect(onDeletePairImages).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', {name: 'Accept pair'}));
    expect(onAcceptReview).toHaveBeenCalledWith('review-dark__review-light');

    await user.click(screen.getByRole('button', {name: 'Reject'}));
    expect(onRejectReview).toHaveBeenCalledWith('review-dark__review-light');

    const reviewSection = screen
      .getByRole('heading', {name: 'Needs Review'})
      .closest('section') as HTMLElement;
    await user.click(within(reviewSection).getByRole('button', {name: 'Delete images'}));
    expect(onDeleteReviewImages).toHaveBeenCalledWith('review-dark__review-light');
  });

  it('shows stronger unmatched selection and delete callback', async () => {
    const user = userEvent.setup();
    const onSelectUnmatchedImage = vi.fn();
    const onDeleteUnmatchedImage = vi.fn();

    render(
      <LibraryManager
        session={buildSession()}
        selectedUnmatchedImageIds={['unmatched-1']}
        onSelectUnmatchedImage={onSelectUnmatchedImage}
        onCreateManualPair={() => {}}
        onOpenPair={() => {}}
        onUnpairPair={() => {}}
        onDeletePairImages={() => {}}
        onAcceptReview={() => {}}
        onRejectReview={() => {}}
        onDeleteReviewImages={() => {}}
        onDeleteUnmatchedImage={onDeleteUnmatchedImage}
        onAddScreenshots={() => {}}
        isAppendingScreenshots={false}
        appendProgress={null}
        onClearLibrary={() => {}}
      />,
    );

    expect(screen.getByText('Selected')).toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: /Select unmatched image unmatched-2/i}));
    expect(onSelectUnmatchedImage).toHaveBeenCalledWith('unmatched-2');

    await user.click(screen.getAllByRole('button', {name: 'Delete image'})[0]);
    expect(onDeleteUnmatchedImage).toHaveBeenCalledWith('unmatched-1');
  });

  it('uploads additional screenshots from library header', async () => {
    const user = userEvent.setup();
    const onAddScreenshots = vi.fn();

    render(
      <LibraryManager
        session={buildSession()}
        selectedUnmatchedImageIds={[]}
        onSelectUnmatchedImage={() => {}}
        onCreateManualPair={() => {}}
        onOpenPair={() => {}}
        onUnpairPair={() => {}}
        onDeletePairImages={() => {}}
        onAcceptReview={() => {}}
        onRejectReview={() => {}}
        onDeleteReviewImages={() => {}}
        onDeleteUnmatchedImage={() => {}}
        onAddScreenshots={onAddScreenshots}
        isAppendingScreenshots={false}
        appendProgress={null}
        onClearLibrary={() => {}}
      />,
    );

    const input = screen.getByTestId('library-add-screenshots-input') as HTMLInputElement;
    await user.upload(input, [
      new File(['a'], 'a.png', {type: 'image/png'}),
      new File(['b'], 'b.png', {type: 'image/png'}),
    ]);

    expect(onAddScreenshots).toHaveBeenCalledTimes(1);
    expect(onAddScreenshots.mock.calls[0][0]).toHaveLength(2);
  });

  it('shows append progress and disables add button while appending', () => {
    render(
      <LibraryManager
        session={buildSession()}
        selectedUnmatchedImageIds={[]}
        onSelectUnmatchedImage={() => {}}
        onCreateManualPair={() => {}}
        onOpenPair={() => {}}
        onUnpairPair={() => {}}
        onDeletePairImages={() => {}}
        onAcceptReview={() => {}}
        onRejectReview={() => {}}
        onDeleteReviewImages={() => {}}
        onDeleteUnmatchedImage={() => {}}
        onAddScreenshots={() => {}}
        isAppendingScreenshots
        appendProgress={{processed: 2, total: 5}}
        onClearLibrary={() => {}}
      />,
    );

    expect(screen.getByText('Adding screenshots: 2/5')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Add screenshots'})).toBeDisabled();
  });
});
