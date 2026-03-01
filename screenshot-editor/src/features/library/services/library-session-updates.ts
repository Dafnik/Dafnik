import {buildLibraryPairs, scoreImagePair} from '@/features/library/services/pair-matching';
import type {
  LibraryImage,
  LibraryPair,
  LibrarySession,
  MatchConfig,
} from '@/features/library/types';

function upsertImageIds(current: string[], idsToAdd: string[]): string[] {
  const values = new Set(current);
  for (const id of idsToAdd) {
    values.add(id);
  }
  return Array.from(values);
}

function withResetCompletion<T extends {completedAt: string | null}>(item: T): T {
  return {
    ...item,
    completedAt: null,
  };
}

function buildSessionWithPairing(
  donePairs: LibraryPair[],
  doneImages: LibraryImage[],
  recomputePool: LibraryImage[],
  partialConfig: Partial<MatchConfig> = {},
): LibrarySession {
  const pairing = buildLibraryPairs(recomputePool, partialConfig);
  return {
    images: [...doneImages, ...recomputePool],
    pairs: [
      ...donePairs,
      ...pairing.autoPairs.map((pair) => ({
        ...pair,
        completedAt: null,
      })),
    ],
    reviewPairs: pairing.reviewPairs.map((review) => ({
      ...review,
      pair: {...review.pair, completedAt: null},
    })),
    unmatchedImageIds: pairing.unmatchedImageIds,
  };
}

export function buildSessionFromImages(
  images: LibraryImage[],
  partialConfig: Partial<MatchConfig> = {},
): LibrarySession {
  const pairing = buildLibraryPairs(images, partialConfig);
  return {
    images,
    pairs: pairing.autoPairs.map((pair) => withResetCompletion(pair)),
    reviewPairs: pairing.reviewPairs.map((review) => ({
      ...review,
      pair: withResetCompletion(review.pair),
    })),
    unmatchedImageIds: pairing.unmatchedImageIds,
  };
}

export function removeImagesFromSession(
  session: LibrarySession,
  imageIds: string[],
): LibrarySession {
  const ids = new Set(imageIds);
  return {
    images: session.images.filter((image) => !ids.has(image.id)),
    pairs: session.pairs.filter(
      (pair) => !ids.has(pair.darkImage.id) && !ids.has(pair.lightImage.id),
    ),
    reviewPairs: session.reviewPairs.filter(
      (review) => !ids.has(review.pair.darkImage.id) && !ids.has(review.pair.lightImage.id),
    ),
    unmatchedImageIds: session.unmatchedImageIds.filter((imageId) => !ids.has(imageId)),
  };
}

export function buildManualPair(first: LibraryImage, second: LibraryImage): LibraryPair {
  const [darkImage, lightImage] =
    first.features.meanLuminance <= second.features.meanLuminance
      ? [first, second]
      : [second, first];
  const score = scoreImagePair(darkImage, lightImage)?.score ?? 0.5;

  return {
    id: `manual-${darkImage.id}-${lightImage.id}`,
    darkImage,
    lightImage,
    score,
    status: 'manual',
    reason: 'manual',
    completedAt: null,
  };
}

export function addManualPairFromUnmatched(
  session: LibrarySession,
  firstImageId: string,
  secondImageId: string,
): LibrarySession {
  const first = session.images.find((image) => image.id === firstImageId);
  const second = session.images.find((image) => image.id === secondImageId);
  if (!first || !second) return session;

  const pair = buildManualPair(first, second);
  return {
    ...session,
    pairs: [...session.pairs.filter((entry) => entry.id !== pair.id), pair],
    unmatchedImageIds: session.unmatchedImageIds.filter(
      (imageId) => imageId !== firstImageId && imageId !== secondImageId,
    ),
  };
}

export function acceptReviewPair(session: LibrarySession, itemId: string): LibrarySession {
  const item = session.reviewPairs.find((entry) => entry.id === itemId);
  if (!item) return session;

  const pair: LibraryPair = {
    ...item.pair,
    status: 'manual',
    reason: 'manual',
    completedAt: null,
  };

  return {
    ...session,
    pairs: [...session.pairs.filter((entry) => entry.id !== pair.id), pair],
    reviewPairs: session.reviewPairs.filter((entry) => entry.id !== itemId),
    unmatchedImageIds: session.unmatchedImageIds.filter(
      (imageId) => imageId !== pair.darkImage.id && imageId !== pair.lightImage.id,
    ),
  };
}

export function rejectReviewPair(session: LibrarySession, itemId: string): LibrarySession {
  const item = session.reviewPairs.find((entry) => entry.id === itemId);
  if (!item) return session;

  return {
    ...session,
    reviewPairs: session.reviewPairs.filter((entry) => entry.id !== itemId),
    unmatchedImageIds: upsertImageIds(session.unmatchedImageIds, [
      item.pair.darkImage.id,
      item.pair.lightImage.id,
    ]),
  };
}

export function unpairLibraryPair(session: LibrarySession, pairId: string): LibrarySession {
  const pair = session.pairs.find((entry) => entry.id === pairId);
  if (!pair) return session;

  return {
    ...session,
    pairs: session.pairs.filter((entry) => entry.id !== pairId),
    unmatchedImageIds: upsertImageIds(session.unmatchedImageIds, [
      pair.darkImage.id,
      pair.lightImage.id,
    ]),
  };
}

export function markPairCompleted(
  session: LibrarySession,
  activePairId: string,
  completedAt: string,
): LibrarySession {
  const existingPair = session.pairs.find((pair) => pair.id === activePairId);
  if (existingPair) {
    return {
      ...session,
      pairs: session.pairs.map((pair) =>
        pair.id === activePairId ? {...pair, completedAt} : pair,
      ),
    };
  }

  const reviewItem = session.reviewPairs.find((item) => item.id === activePairId);
  if (!reviewItem) return session;

  const completedPair: LibraryPair = {
    ...reviewItem.pair,
    status: 'manual',
    reason: 'manual',
    completedAt,
  };
  return {
    ...session,
    pairs: [...session.pairs.filter((pair) => pair.id !== completedPair.id), completedPair],
    reviewPairs: session.reviewPairs.filter((item) => item.id !== activePairId),
    unmatchedImageIds: session.unmatchedImageIds.filter(
      (imageId) =>
        imageId !== completedPair.darkImage.id && imageId !== completedPair.lightImage.id,
    ),
  };
}

export function appendAndRecomputeSession(
  session: LibrarySession,
  extractedImages: LibraryImage[],
  idPrefix = `app-${Date.now()}`,
  partialConfig: Partial<MatchConfig> = {},
): LibrarySession {
  const donePairs = session.pairs.filter((pair) => pair.completedAt !== null);
  const doneImageIds = new Set<string>();
  for (const pair of donePairs) {
    doneImageIds.add(pair.darkImage.id);
    doneImageIds.add(pair.lightImage.id);
  }

  const existingIds = new Set(session.images.map((image) => image.id));
  const appendedImages = extractedImages.map((image, index) => {
    const baseId = `${idPrefix}-${index}-${image.id}`;
    let uniqueId = baseId;
    let attempt = 1;
    while (existingIds.has(uniqueId)) {
      uniqueId = `${baseId}-${attempt}`;
      attempt += 1;
    }
    existingIds.add(uniqueId);
    return {
      ...image,
      id: uniqueId,
    };
  });

  const doneImages = session.images.filter((image) => doneImageIds.has(image.id));
  const recomputeBaseImages = session.images.filter((image) => !doneImageIds.has(image.id));
  const recomputePool = [...recomputeBaseImages, ...appendedImages];
  return buildSessionWithPairing(donePairs, doneImages, recomputePool, partialConfig);
}

export function recomputeSessionPairs(
  session: LibrarySession,
  partialConfig: Partial<MatchConfig> = {},
): LibrarySession {
  const donePairs = session.pairs.filter((pair) => pair.completedAt !== null);
  const doneImageIds = new Set<string>();
  for (const pair of donePairs) {
    doneImageIds.add(pair.darkImage.id);
    doneImageIds.add(pair.lightImage.id);
  }

  const doneImages = session.images.filter((image) => doneImageIds.has(image.id));
  const recomputePool = session.images.filter((image) => !doneImageIds.has(image.id));
  return buildSessionWithPairing(donePairs, doneImages, recomputePool, partialConfig);
}
