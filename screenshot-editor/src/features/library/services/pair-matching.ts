import type {
  LibraryImage,
  MatchConfig,
  PairCandidate,
  PairingResult,
  ReviewItem,
  LibraryPair,
} from '@/features/library/types';

const DEFAULT_CONFIG: MatchConfig = {
  sizeToleranceRatio: 0.03,
  aspectToleranceRatio: 0.03,
  autoPairThreshold: 0.8,
  reviewPairThreshold: 0.72,
  minLuminanceDelta: 12,
};

const BYTE_BIT_COUNTS = new Uint8Array(
  Array.from({length: 256}, (_, value) => {
    let count = 0;
    let current = value;
    while (current > 0) {
      count += current & 1;
      current >>= 1;
    }
    return count;
  }),
);

function buildPairId(lightImageId: string, darkImageId: string): string {
  return `${darkImageId}__${lightImageId}`;
}

function relativeDifference(a: number, b: number): number {
  const baseline = Math.max(Math.abs(a), Math.abs(b), 1);
  return Math.abs(a - b) / baseline;
}

function isDimensionCompatible(
  first: LibraryImage,
  second: LibraryImage,
  config: MatchConfig,
): boolean {
  const widthDiff = relativeDifference(first.features.width, second.features.width);
  const heightDiff = relativeDifference(first.features.height, second.features.height);
  const aspectDiff = relativeDifference(first.features.aspectRatio, second.features.aspectRatio);
  return (
    widthDiff <= config.sizeToleranceRatio &&
    heightDiff <= config.sizeToleranceRatio &&
    aspectDiff <= config.aspectToleranceRatio
  );
}

function hammingDistance(first: Uint8Array, second: Uint8Array): number {
  const length = Math.min(first.length, second.length);
  let distance = 0;
  for (let index = 0; index < length; index += 1) {
    distance += BYTE_BIT_COUNTS[first[index] ^ second[index]];
  }
  return distance;
}

export function scoreImagePair(
  darkImage: LibraryImage,
  lightImage: LibraryImage,
  config: MatchConfig = DEFAULT_CONFIG,
): PairCandidate | null {
  const sizeCompatibility = isDimensionCompatible(darkImage, lightImage, config) ? 1 : 0;
  if (sizeCompatibility === 0) {
    return null;
  }

  const distance = hammingDistance(darkImage.features.edgeHash, lightImage.features.edgeHash);
  const edgeSimilarity = 1 - distance / 256;
  const luminanceDelta = Math.abs(
    lightImage.features.meanLuminance - darkImage.features.meanLuminance,
  );
  const luminanceContrast = Math.max(0, Math.min(1, luminanceDelta / 255));

  const score = 0.7 * edgeSimilarity + 0.2 * sizeCompatibility + 0.1 * luminanceContrast;

  return {
    darkImageId: darkImage.id,
    lightImageId: lightImage.id,
    edgeSimilarity,
    luminanceContrast,
    sizeCompatibility,
    luminanceDelta,
    score,
  };
}

function sortByLuminance(images: LibraryImage[]): LibraryImage[] {
  return [...images].sort((a, b) => {
    if (a.features.meanLuminance === b.features.meanLuminance) {
      return a.id.localeCompare(b.id);
    }
    return a.features.meanLuminance - b.features.meanLuminance;
  });
}

function partitionByMedian(images: LibraryImage[]): {
  darkImages: LibraryImage[];
  lightImages: LibraryImage[];
} {
  const sorted = sortByLuminance(images);
  const pivot = Math.floor(sorted.length / 2);
  return {
    darkImages: sorted.slice(0, pivot),
    lightImages: sorted.slice(pivot),
  };
}

function toLibraryPair(
  candidate: PairCandidate,
  imagesById: Map<string, LibraryImage>,
  status: LibraryPair['status'],
  reason: LibraryPair['reason'],
): LibraryPair {
  const darkImage = imagesById.get(candidate.darkImageId);
  const lightImage = imagesById.get(candidate.lightImageId);
  if (!darkImage || !lightImage) {
    throw new Error('Pair candidate references missing images.');
  }

  return {
    id: buildPairId(lightImage.id, darkImage.id),
    darkImage,
    lightImage,
    score: candidate.score,
    status,
    reason,
    completedAt: null,
  };
}

function sortCandidates(candidates: PairCandidate[]): PairCandidate[] {
  return [...candidates].sort((first, second) => {
    if (first.score !== second.score) return second.score - first.score;

    if (first.darkImageId !== second.darkImageId) {
      return first.darkImageId.localeCompare(second.darkImageId);
    }

    return first.lightImageId.localeCompare(second.lightImageId);
  });
}

export function buildLibraryPairs(
  images: LibraryImage[],
  partialConfig: Partial<MatchConfig> = {},
): PairingResult {
  const config = {...DEFAULT_CONFIG, ...partialConfig};
  const imagesById = new Map(images.map((image) => [image.id, image]));

  if (images.length < 2) {
    return {
      autoPairs: [],
      reviewPairs: [],
      unmatchedImageIds: images.map((image) => image.id),
      candidates: [],
    };
  }

  const {darkImages, lightImages} = partitionByMedian(images);
  const candidates: PairCandidate[] = [];
  for (const darkImage of darkImages) {
    for (const lightImage of lightImages) {
      const candidate = scoreImagePair(darkImage, lightImage, config);
      if (!candidate) continue;
      candidates.push(candidate);
    }
  }

  const usedImageIds = new Set<string>();
  const selected: PairCandidate[] = [];
  for (const candidate of sortCandidates(candidates)) {
    if (candidate.score < config.reviewPairThreshold) {
      break;
    }
    if (usedImageIds.has(candidate.darkImageId) || usedImageIds.has(candidate.lightImageId)) {
      continue;
    }
    selected.push(candidate);
    usedImageIds.add(candidate.darkImageId);
    usedImageIds.add(candidate.lightImageId);
  }

  const autoPairs: LibraryPair[] = [];
  const reviewPairs: ReviewItem[] = [];
  const matchedImageIds = new Set<string>();

  for (const candidate of selected) {
    const isAutoPair =
      candidate.score >= config.autoPairThreshold &&
      candidate.luminanceDelta >= config.minLuminanceDelta;

    if (isAutoPair) {
      const pair = toLibraryPair(candidate, imagesById, 'auto', 'high match');
      autoPairs.push(pair);
      matchedImageIds.add(candidate.darkImageId);
      matchedImageIds.add(candidate.lightImageId);
      continue;
    }

    const reviewPair = toLibraryPair(candidate, imagesById, 'auto', 'borderline');
    reviewPairs.push({
      id: reviewPair.id,
      pair: reviewPair,
      reason: 'borderline',
    });
    matchedImageIds.add(candidate.darkImageId);
    matchedImageIds.add(candidate.lightImageId);
  }

  const unmatchedImageIds = images
    .map((image) => image.id)
    .filter((imageId) => !matchedImageIds.has(imageId));

  return {
    autoPairs,
    reviewPairs,
    unmatchedImageIds,
    candidates,
  };
}
