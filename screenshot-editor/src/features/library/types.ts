export interface ImageFeatures {
  width: number;
  height: number;
  aspectRatio: number;
  meanLuminance: number;
  grayscaleThumbnail: Uint8ClampedArray;
  edgeMap: Uint8ClampedArray;
  edgeHash: Uint8Array;
}

export interface LibraryImage {
  id: string;
  fileName: string;
  dataUrl: string;
  features: ImageFeatures;
}

export interface PairCandidate {
  darkImageId: string;
  lightImageId: string;
  edgeSimilarity: number;
  luminanceContrast: number;
  sizeCompatibility: 0 | 1;
  luminanceDelta: number;
  score: number;
}

export type LibraryPairStatus = 'auto' | 'manual';
export type PairReason = 'high match' | 'borderline' | 'manual';

export interface LibraryPair {
  id: string;
  darkImage: LibraryImage;
  lightImage: LibraryImage;
  score: number;
  status: LibraryPairStatus;
  reason: PairReason;
  completedAt: string | null;
}

export interface ReviewItem {
  id: string;
  pair: LibraryPair;
  reason: 'borderline';
}

export interface LibrarySession {
  images: LibraryImage[];
  pairs: LibraryPair[];
  reviewPairs: ReviewItem[];
  unmatchedImageIds: string[];
}

export interface MatchConfig {
  sizeToleranceRatio: number;
  aspectToleranceRatio: number;
  autoPairThreshold: number;
  reviewPairThreshold: number;
  minLuminanceDelta: number;
}

export interface PairingResult {
  autoPairs: LibraryPair[];
  reviewPairs: ReviewItem[];
  unmatchedImageIds: string[];
  candidates: PairCandidate[];
}
