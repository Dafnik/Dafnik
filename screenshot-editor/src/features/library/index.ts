export type {
  ImageFeatures,
  LibraryImage,
  PairCandidate,
  LibraryPair,
  ReviewItem,
  LibrarySession,
  MatchConfig,
  PairingResult,
} from './types';
export {extractFeatures, computeImageFeaturesFromRgba} from './services/feature-extraction';
export {buildLibraryPairs, scoreImagePair} from './services/pair-matching';
export {LibraryManager} from './components/library-manager';
