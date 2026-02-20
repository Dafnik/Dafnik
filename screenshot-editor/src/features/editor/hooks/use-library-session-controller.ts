import {useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction} from 'react';
import {deriveSplitExportName} from '@/features/editor/lib/export-filename';
import {getImageDimensions} from '@/features/editor/services/file-loading';
import {orderBySidePreference} from '@/features/editor/state/store/helpers';
import type {InitializeEditorPayload, LightImageSide} from '@/features/editor/state/types';
import {extractFeatures} from '@/features/library/services/feature-extraction';
import {
  acceptReviewPair,
  addManualPairFromUnmatched,
  appendAndRecomputeSession,
  buildSessionFromImages,
  markPairCompleted,
  rejectReviewPair,
  removeImagesFromSession,
  unpairLibraryPair,
} from '@/features/library/services/library-session-updates';
import type {LibraryPair, LibrarySession} from '@/features/library/types';

export interface AnalysisProgress {
  processed: number;
  total: number;
}

export type EditorSource = {mode: 'library'; pairId: string} | {mode: 'direct'} | null;

interface UseLibrarySessionControllerOptions {
  lightImageSide: LightImageSide;
  initializeEditor: (payload: InitializeEditorPayload) => void;
  setActiveEditorSource: Dispatch<SetStateAction<EditorSource>>;
}

export function useLibrarySessionController({
  lightImageSide,
  initializeEditor,
  setActiveEditorSource,
}: UseLibrarySessionControllerOptions) {
  const [librarySession, setLibrarySession] = useState<LibrarySession | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null);
  const [appendProgress, setAppendProgress] = useState<AnalysisProgress | null>(null);
  const [isAppendingScreenshots, setIsAppendingScreenshots] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [selectedUnmatchedImageIds, setSelectedUnmatchedImageIds] = useState<string[]>([]);
  const librarySessionRef = useRef<LibrarySession | null>(null);

  useEffect(() => {
    librarySessionRef.current = librarySession;
  }, [librarySession]);

  useEffect(() => {
    setSelectedUnmatchedImageIds((current) => {
      if (!librarySession) return [];
      const available = new Set(librarySession.unmatchedImageIds);
      return current.filter((imageId) => available.has(imageId)).slice(0, 2);
    });
  }, [librarySession]);

  const analyzeLibraryFiles = useCallback(
    (files: File[]) => {
      const analyze = async () => {
        if (files.length === 0) return;

        setLibraryError(null);
        setAnalysisProgress({processed: 0, total: files.length});
        try {
          const images = await extractFeatures(files, {
            thumbnailSize: 96,
            concurrency: 4,
            onProgress: (processed, total) => setAnalysisProgress({processed, total}),
          });
          setLibrarySession(buildSessionFromImages(images));
          setSelectedUnmatchedImageIds([]);
          setActiveEditorSource(null);
        } catch {
          setLibrarySession(null);
          setLibraryError(
            'Library analysis failed for one or more files. Please retry with valid image files.',
          );
        } finally {
          setAnalysisProgress(null);
        }
      };

      void analyze();
    },
    [setActiveEditorSource],
  );

  const clearLibrary = useCallback(() => {
    setLibrarySession(null);
    setLibraryError(null);
    setSelectedUnmatchedImageIds([]);
    setActiveEditorSource(null);
  }, [setActiveEditorSource]);

  const openLibraryPair = useCallback(
    (pair: LibraryPair) => {
      const openPair = async () => {
        const ordered = orderBySidePreference(
          pair.lightImage.dataUrl,
          pair.darkImage.dataUrl,
          lightImageSide,
        );
        const dimensions = await getImageDimensions(ordered.image1);
        const exportBaseName = deriveSplitExportName(
          pair.lightImage.fileName,
          pair.darkImage.fileName,
        );

        initializeEditor({
          image1: ordered.image1,
          image2: ordered.image2,
          width: dimensions.width,
          height: dimensions.height,
          exportBaseName,
        });
        setActiveEditorSource({mode: 'library', pairId: pair.id});
      };

      void openPair();
    },
    [initializeEditor, lightImageSide, setActiveEditorSource],
  );

  const selectUnmatchedImage = useCallback((imageId: string) => {
    setSelectedUnmatchedImageIds((current) => {
      if (current.includes(imageId)) {
        return current.filter((entry) => entry !== imageId);
      }
      if (current.length === 2) {
        return [current[1], imageId];
      }
      return [...current, imageId];
    });
  }, []);

  const createManualPair = useCallback(() => {
    if (selectedUnmatchedImageIds.length !== 2) return;

    setLibrarySession((current) => {
      if (!current) return current;
      return addManualPairFromUnmatched(
        current,
        selectedUnmatchedImageIds[0],
        selectedUnmatchedImageIds[1],
      );
    });
    setSelectedUnmatchedImageIds([]);
  }, [selectedUnmatchedImageIds]);

  const acceptReview = useCallback((itemId: string) => {
    setLibrarySession((current) => (current ? acceptReviewPair(current, itemId) : current));
  }, []);

  const rejectReview = useCallback((itemId: string) => {
    setLibrarySession((current) => (current ? rejectReviewPair(current, itemId) : current));
  }, []);

  const unpairPair = useCallback((pairId: string) => {
    setLibrarySession((current) => (current ? unpairLibraryPair(current, pairId) : current));
  }, []);

  const deletePairImages = useCallback((pairId: string) => {
    const pair = librarySessionRef.current?.pairs.find((entry) => entry.id === pairId);
    if (!pair) return;
    const removedIds = [pair.darkImage.id, pair.lightImage.id];

    setLibrarySession((current) =>
      current ? removeImagesFromSession(current, removedIds) : current,
    );
    setSelectedUnmatchedImageIds((current) => current.filter((id) => !removedIds.includes(id)));
  }, []);

  const deleteReviewImages = useCallback((itemId: string) => {
    setLibrarySession((current) => {
      if (!current) return current;
      const item = current.reviewPairs.find((entry) => entry.id === itemId);
      if (!item) return current;
      return removeImagesFromSession(current, [item.pair.darkImage.id, item.pair.lightImage.id]);
    });
  }, []);

  const deleteUnmatchedImage = useCallback((imageId: string) => {
    setLibrarySession((current) =>
      current ? removeImagesFromSession(current, [imageId]) : current,
    );
    setSelectedUnmatchedImageIds((current) => current.filter((entry) => entry !== imageId));
  }, []);

  const addLibraryScreenshots = useCallback((files: File[]) => {
    const append = async () => {
      const currentSession = librarySessionRef.current;
      if (!currentSession) return;

      const imageFiles = files.filter((file) => file.type.startsWith('image/'));
      if (imageFiles.length === 0) return;

      setLibraryError(null);
      setIsAppendingScreenshots(true);
      setAppendProgress({processed: 0, total: imageFiles.length});

      try {
        const extracted = await extractFeatures(imageFiles, {
          thumbnailSize: 96,
          concurrency: 4,
          onProgress: (processed, total) => setAppendProgress({processed, total}),
        });

        setLibrarySession((session) =>
          session ? appendAndRecomputeSession(session, extracted, `app-${Date.now()}`) : session,
        );
        setSelectedUnmatchedImageIds([]);
      } catch {
        setLibraryError(
          'Could not append screenshots right now. Your existing library is unchanged.',
        );
      } finally {
        setIsAppendingScreenshots(false);
        setAppendProgress(null);
      }
    };

    void append();
  }, []);

  const markExportedPairComplete = useCallback((source: EditorSource) => {
    if (source?.mode !== 'library') return;
    const now = new Date().toISOString();
    setLibrarySession((current) =>
      current ? markPairCompleted(current, source.pairId, now) : current,
    );
  }, []);

  const resetForDirectMode = useCallback(() => {
    setLibrarySession(null);
    setSelectedUnmatchedImageIds([]);
    setAnalysisProgress(null);
  }, []);

  const setError = useCallback((message: string | null) => {
    setLibraryError(message);
  }, []);

  return {
    librarySession,
    analysisProgress,
    appendProgress,
    isAppendingScreenshots,
    libraryError,
    selectedUnmatchedImageIds,
    setLibraryError: setError,
    analyzeLibraryFiles,
    resetForDirectMode,
    clearLibrary,
    openLibraryPair,
    selectUnmatchedImage,
    createManualPair,
    acceptReview,
    rejectReview,
    unpairPair,
    deletePairImages,
    deleteReviewImages,
    deleteUnmatchedImage,
    addLibraryScreenshots,
    markExportedPairComplete,
  };
}
