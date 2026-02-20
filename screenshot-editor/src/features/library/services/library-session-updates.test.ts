import {describe, expect, it} from 'vitest';
import {
  acceptReviewPair,
  appendAndRecomputeSession,
  rejectReviewPair,
  removeImagesFromSession,
  unpairLibraryPair,
} from '@/features/library/services/library-session-updates';
import type {LibraryImage, LibraryPair, LibrarySession} from '@/features/library/types';

function makeImage(id: string, luminance: number): LibraryImage {
  return {
    id,
    fileName: `${id}.png`,
    dataUrl: `data:image/png;base64,${id}`,
    features: {
      width: 100,
      height: 80,
      aspectRatio: 1.25,
      meanLuminance: luminance,
      grayscaleThumbnail: new Uint8ClampedArray([0]),
      edgeMap: new Uint8ClampedArray([0]),
      edgeHash: new Uint8Array(32),
    },
  };
}

function makePair(id: string, darkImage: LibraryImage, lightImage: LibraryImage): LibraryPair {
  return {
    id,
    darkImage,
    lightImage,
    score: 0.9,
    status: 'auto',
    reason: 'high match',
    completedAt: null,
  };
}

describe('library session updates', () => {
  it('accept/reject/unpair/delete keep pairs/review/unmatched in sync', () => {
    const darkA = makeImage('dark-a', 10);
    const lightA = makeImage('light-a', 200);
    const darkB = makeImage('dark-b', 15);
    const lightB = makeImage('light-b', 190);
    const pairA = makePair('pair-a', darkA, lightA);
    const reviewPairB = makePair('review-b', darkB, lightB);

    const baseSession: LibrarySession = {
      images: [darkA, lightA, darkB, lightB],
      pairs: [pairA],
      reviewPairs: [{id: 'review-b', pair: reviewPairB, reason: 'borderline'}],
      unmatchedImageIds: [darkB.id, lightB.id],
    };

    const accepted = acceptReviewPair(baseSession, 'review-b');
    expect(accepted.reviewPairs).toHaveLength(0);
    expect(accepted.pairs).toHaveLength(2);
    expect(accepted.pairs.find((pair) => pair.id === 'review-b')?.status).toBe('manual');
    expect(accepted.unmatchedImageIds).toEqual([]);

    const rejected = rejectReviewPair(baseSession, 'review-b');
    expect(rejected.reviewPairs).toHaveLength(0);
    expect(new Set(rejected.unmatchedImageIds)).toEqual(new Set([darkB.id, lightB.id]));

    const unpaired = unpairLibraryPair(baseSession, 'pair-a');
    expect(unpaired.pairs).toHaveLength(0);
    expect(new Set(unpaired.unmatchedImageIds)).toEqual(
      new Set([darkB.id, lightB.id, darkA.id, lightA.id]),
    );

    const removed = removeImagesFromSession(unpaired, [darkB.id]);
    expect(removed.images.some((image) => image.id === darkB.id)).toBe(false);
    expect(removed.unmatchedImageIds.includes(darkB.id)).toBe(false);
  });

  it('append and recompute keeps completed pairs untouched', () => {
    const darkDone = makeImage('dark-done', 20);
    const lightDone = makeImage('light-done', 220);
    const darkActive = makeImage('dark-active', 35);
    const lightActive = makeImage('light-active', 200);
    const appendedDark = makeImage('dark-new', 30);
    const appendedLight = makeImage('light-new', 210);

    const donePair = {
      ...makePair('done-pair', darkDone, lightDone),
      completedAt: '2026-02-20T10:00:00.000Z',
    };
    const activePair = makePair('active-pair', darkActive, lightActive);

    const session: LibrarySession = {
      images: [darkDone, lightDone, darkActive, lightActive],
      pairs: [donePair, activePair],
      reviewPairs: [],
      unmatchedImageIds: [],
    };

    const next = appendAndRecomputeSession(session, [appendedDark, appendedLight], 'append');
    expect(next.pairs.some((pair) => pair.id === 'done-pair' && pair.completedAt !== null)).toBe(
      true,
    );
    expect(next.images.some((image) => image.id.includes('append-0-'))).toBe(true);
    expect(next.images.some((image) => image.id.includes('append-1-'))).toBe(true);
  });
});
