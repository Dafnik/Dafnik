import {useCallback, useEffect, useRef, useState} from 'react';
import {Button} from '@/components/ui/button';
import {DesktopOnlyPage} from '@/components/desktop-only-page';
import {DropZone} from '@/components/drop-zone';
import {EditorLayout} from '@/features/editor/components/layout/editor-layout';
import {useEditorShortcuts} from '@/features/editor/hooks/use-editor-shortcuts';
import {
  deriveSingleImageExportName,
  deriveSplitExportName,
} from '@/features/editor/lib/export-filename';
import {classifyByLuminance} from '@/features/editor/services/image-classification';
import {getImageDimensions, readFileAsDataUrl} from '@/features/editor/services/file-loading';
import {orderBySidePreference} from '@/features/editor/state/store/helpers';
import {useEditorStore, useEditorStoreApi} from '@/features/editor/state/use-editor-store';
import type {LightSelection} from '@/features/editor/state/types';
import {LibraryManager} from '@/features/library/components/library-manager';
import {extractFeatures} from '@/features/library/services/feature-extraction';
import {buildLibraryPairs, scoreImagePair} from '@/features/library/services/pair-matching';
import type {LibraryImage, LibraryPair, LibrarySession} from '@/features/library/types';

const MIN_DESKTOP_WIDTH_PX = 1012;

interface AnalysisProgress {
  processed: number;
  total: number;
}

type EditorSource = {mode: 'library'; pairId: string} | {mode: 'direct'} | null;

function getViewportWidth(): number {
  if (typeof window === 'undefined') return MIN_DESKTOP_WIDTH_PX;
  return window.innerWidth;
}

function upsertImageIds(current: string[], idsToAdd: string[]): string[] {
  const values = new Set(current);
  for (const id of idsToAdd) {
    values.add(id);
  }
  return Array.from(values);
}

function removeImagesFromLibrarySession(
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

function buildManualPair(first: LibraryImage, second: LibraryImage): LibraryPair {
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

export function EditorRoot() {
  useEditorShortcuts();
  const [viewportWidth, setViewportWidth] = useState(getViewportWidth);
  const [librarySession, setLibrarySession] = useState<LibrarySession | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null);
  const [appendProgress, setAppendProgress] = useState<AnalysisProgress | null>(null);
  const [isAppendingScreenshots, setIsAppendingScreenshots] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [activeEditorSource, setActiveEditorSource] = useState<EditorSource>(null);
  const [selectedUnmatchedImageIds, setSelectedUnmatchedImageIds] = useState<string[]>([]);

  const isEditing = useEditorStore((state) => state.isEditing);
  const lightImageSide = useEditorStore((state) => state.lightImageSide);
  const openLightSelector = useEditorStore((state) => state.openLightSelector);
  const resolveLightSelector = useEditorStore((state) => state.resolveLightSelector);
  const initializeEditor = useEditorStore((state) => state.initializeEditor);
  const resetProject = useEditorStore((state) => state.resetProject);

  const editorStoreApi = useEditorStoreApi();
  const pendingSelectionResolver = useRef<((selection: LightSelection) => void) | null>(null);
  const primaryUploadBaseNameRef = useRef<string | null>(null);
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

  const requestLightImageSelection = useCallback(
    (firstImage: string, secondImage: string) =>
      new Promise<LightSelection>((resolve) => {
        pendingSelectionResolver.current = resolve;
        openLightSelector({firstImage, secondImage});
      }),
    [openLightSelector],
  );

  const finalizeLightSelection = useCallback(
    (selection: LightSelection) => {
      resolveLightSelector(selection);
      const resolve = pendingSelectionResolver.current;
      pendingSelectionResolver.current = null;
      resolve?.(selection);
    },
    [resolveLightSelector],
  );

  useEffect(
    () => () => {
      pendingSelectionResolver.current?.('cancel');
      pendingSelectionResolver.current = null;
    },
    [],
  );

  useEffect(() => {
    const handleResize = () => setViewportWidth(getViewportWidth());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const classifyPair = useCallback(
    async (firstImage: string, secondImage: string) => {
      const classified = await classifyByLuminance(firstImage, secondImage);
      if (classified.status === 'resolved') {
        return classified;
      }

      const selection = await requestLightImageSelection(firstImage, secondImage);
      if (selection === 'cancel') return null;

      return selection === 'first'
        ? {status: 'resolved' as const, lightImage: firstImage, darkImage: secondImage}
        : {status: 'resolved' as const, lightImage: secondImage, darkImage: firstImage};
    },
    [requestLightImageSelection],
  );

  const handleImagesLoaded = useCallback(
    (files: File[]) => {
      const init = async () => {
        if (files.length === 0) return;
        setLibraryError(null);

        if (files.length > 2) {
          setAnalysisProgress({processed: 0, total: files.length});
          try {
            const images = await extractFeatures(files, {
              thumbnailSize: 96,
              concurrency: 4,
              onProgress: (processed, total) => setAnalysisProgress({processed, total}),
            });
            const pairing = buildLibraryPairs(images);
            setLibrarySession({
              images,
              pairs: pairing.autoPairs.map((pair) => ({...pair, completedAt: null})),
              reviewPairs: pairing.reviewPairs.map((review) => ({
                ...review,
                pair: {...review.pair, completedAt: null},
              })),
              unmatchedImageIds: pairing.unmatchedImageIds,
            });
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
          return;
        }

        setLibrarySession(null);
        setSelectedUnmatchedImageIds([]);
        setAnalysisProgress(null);

        const firstFile = files[0];
        const secondFile = files[1] ?? null;
        const inputImage1 = await readFileAsDataUrl(firstFile);
        const inputImage2 = secondFile ? await readFileAsDataUrl(secondFile) : null;

        let image1 = inputImage1;
        let image2 = inputImage2;

        const firstFileName = firstFile?.name ?? null;
        const secondFileName = secondFile?.name ?? null;
        const singleExportName = deriveSingleImageExportName(firstFileName);
        const splitExportName = deriveSplitExportName(firstFileName, secondFileName);
        const exportBaseName = inputImage2 ? splitExportName : singleExportName;
        primaryUploadBaseNameRef.current = singleExportName;

        if (inputImage2) {
          const classified = await classifyPair(inputImage1, inputImage2);
          if (!classified) return;

          const ordered = orderBySidePreference(
            classified.lightImage,
            classified.darkImage,
            lightImageSide,
          );
          image1 = ordered.image1;
          image2 = ordered.image2;
        }

        const dimensions = await getImageDimensions(image1);
        initializeEditor({
          image1,
          image2,
          width: dimensions.width,
          height: dimensions.height,
          exportBaseName,
        });
        setActiveEditorSource({mode: 'direct'});
      };

      void init();
    },
    [classifyPair, initializeEditor, lightImageSide],
  );

  const handleOpenLibraryPair = useCallback(
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
        primaryUploadBaseNameRef.current = deriveSingleImageExportName(pair.lightImage.fileName);

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
    [initializeEditor, lightImageSide],
  );

  const handleSelectUnmatchedImage = useCallback((imageId: string) => {
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

  const handleCreateManualPair = useCallback(() => {
    if (selectedUnmatchedImageIds.length !== 2) return;

    setLibrarySession((current) => {
      if (!current) return current;

      const first = current.images.find((image) => image.id === selectedUnmatchedImageIds[0]);
      const second = current.images.find((image) => image.id === selectedUnmatchedImageIds[1]);
      if (!first || !second) return current;

      const pair = buildManualPair(first, second);
      return {
        ...current,
        pairs: [...current.pairs.filter((entry) => entry.id !== pair.id), pair],
        unmatchedImageIds: current.unmatchedImageIds.filter(
          (imageId) => !selectedUnmatchedImageIds.includes(imageId),
        ),
      };
    });
    setSelectedUnmatchedImageIds([]);
  }, [selectedUnmatchedImageIds]);

  const handleAcceptReview = useCallback((itemId: string) => {
    setLibrarySession((current) => {
      if (!current) return current;
      const item = current.reviewPairs.find((entry) => entry.id === itemId);
      if (!item) return current;

      const pair: LibraryPair = {
        ...item.pair,
        status: 'manual',
        reason: 'manual',
        completedAt: null,
      };

      return {
        ...current,
        pairs: [...current.pairs.filter((entry) => entry.id !== pair.id), pair],
        reviewPairs: current.reviewPairs.filter((entry) => entry.id !== itemId),
        unmatchedImageIds: current.unmatchedImageIds.filter(
          (imageId) => imageId !== pair.darkImage.id && imageId !== pair.lightImage.id,
        ),
      };
    });
  }, []);

  const handleRejectReview = useCallback((itemId: string) => {
    setLibrarySession((current) => {
      if (!current) return current;
      const item = current.reviewPairs.find((entry) => entry.id === itemId);
      if (!item) return current;

      return {
        ...current,
        reviewPairs: current.reviewPairs.filter((entry) => entry.id !== itemId),
        unmatchedImageIds: upsertImageIds(current.unmatchedImageIds, [
          item.pair.darkImage.id,
          item.pair.lightImage.id,
        ]),
      };
    });
  }, []);

  const handleUnpairPair = useCallback((pairId: string) => {
    setLibrarySession((current) => {
      if (!current) return current;
      const pair = current.pairs.find((entry) => entry.id === pairId);
      if (!pair) return current;

      return {
        ...current,
        pairs: current.pairs.filter((entry) => entry.id !== pairId),
        unmatchedImageIds: upsertImageIds(current.unmatchedImageIds, [
          pair.darkImage.id,
          pair.lightImage.id,
        ]),
      };
    });
  }, []);

  const handleDeletePairImages = useCallback((pairId: string) => {
    const pair = librarySessionRef.current?.pairs.find((entry) => entry.id === pairId);
    if (!pair) return;
    const removedIds = [pair.darkImage.id, pair.lightImage.id];

    setLibrarySession((current) => {
      if (!current) return current;
      return removeImagesFromLibrarySession(current, removedIds);
    });

    setSelectedUnmatchedImageIds((current) => current.filter((id) => !removedIds.includes(id)));
  }, []);

  const handleDeleteReviewImages = useCallback((itemId: string) => {
    setLibrarySession((current) => {
      if (!current) return current;
      const item = current.reviewPairs.find((entry) => entry.id === itemId);
      if (!item) return current;
      return removeImagesFromLibrarySession(current, [
        item.pair.darkImage.id,
        item.pair.lightImage.id,
      ]);
    });
  }, []);

  const handleDeleteUnmatchedImage = useCallback((imageId: string) => {
    setLibrarySession((current) => {
      if (!current) return current;
      return removeImagesFromLibrarySession(current, [imageId]);
    });
    setSelectedUnmatchedImageIds((current) => current.filter((entry) => entry !== imageId));
  }, []);

  const handleAddLibraryScreenshots = useCallback((files: File[]) => {
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

        setLibrarySession((session) => {
          if (!session) return session;

          const donePairs = session.pairs.filter((pair) => pair.completedAt !== null);
          const doneImageIds = new Set<string>();
          for (const pair of donePairs) {
            doneImageIds.add(pair.darkImage.id);
            doneImageIds.add(pair.lightImage.id);
          }

          const existingIds = new Set(session.images.map((image) => image.id));
          const appendedImages = extracted.map((image, index) => {
            const baseId = `app-${Date.now()}-${index}-${image.id}`;
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
          const pairing = buildLibraryPairs(recomputePool);

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
        });
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

  const handleExportComplete = useCallback(
    ({leaveAfterExport}: {leaveAfterExport: boolean}) => {
      if (activeEditorSource?.mode === 'library') {
        const now = new Date().toISOString();
        const activePairId = activeEditorSource.pairId;

        setLibrarySession((current) => {
          if (!current) return current;

          const existingPair = current.pairs.find((pair) => pair.id === activePairId);
          if (existingPair) {
            return {
              ...current,
              pairs: current.pairs.map((pair) =>
                pair.id === activePairId ? {...pair, completedAt: now} : pair,
              ),
            };
          }

          const reviewItem = current.reviewPairs.find((item) => item.id === activePairId);
          if (!reviewItem) return current;

          const completedPair: LibraryPair = {
            ...reviewItem.pair,
            status: 'manual',
            reason: 'manual',
            completedAt: now,
          };
          return {
            ...current,
            pairs: [...current.pairs.filter((pair) => pair.id !== completedPair.id), completedPair],
            reviewPairs: current.reviewPairs.filter((item) => item.id !== activePairId),
            unmatchedImageIds: current.unmatchedImageIds.filter(
              (imageId) =>
                imageId !== completedPair.darkImage.id && imageId !== completedPair.lightImage.id,
            ),
          };
        });
      }

      if (leaveAfterExport) {
        setActiveEditorSource(null);
        resetProject();
      }
    },
    [activeEditorSource, resetProject],
  );

  const handleAddSecondImage = useCallback(
    (dataUrl: string, fileName: string | null) => {
      const addSecond = async () => {
        const state = editorStoreApi.getState();
        if (!state.image1) return;

        const classified = await classifyPair(state.image1, dataUrl);
        if (!classified) return;

        const ordered = orderBySidePreference(
          classified.lightImage,
          classified.darkImage,
          state.lightImageSide,
        );

        editorStoreApi.setState({
          image1: ordered.image1,
          image2: ordered.image2,
          showSplitViewSidebar: true,
        });
        const derivedExportName = deriveSplitExportName(
          primaryUploadBaseNameRef.current ?? state.exportBaseName,
          fileName,
        );
        if (derivedExportName) {
          editorStoreApi.getState().setExportBaseName(derivedExportName);
        }
        editorStoreApi.getState().pushHistorySnapshot();
        setActiveEditorSource({mode: 'direct'});
      };

      void addSecond();
    },
    [classifyPair, editorStoreApi],
  );

  if (viewportWidth < MIN_DESKTOP_WIDTH_PX) {
    return <DesktopOnlyPage minWidthPx={MIN_DESKTOP_WIDTH_PX} />;
  }

  if (!isEditing) {
    if (analysisProgress) {
      return (
        <div className="bg-background flex h-screen w-screen items-center justify-center px-4">
          <div className="border-border bg-card w-full max-w-lg border-2 p-6 text-center">
            <h2 className="text-foreground text-lg font-semibold">Analyzing Screenshot Library</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              analyzing {analysisProgress.processed}/{analysisProgress.total}
            </p>
          </div>
        </div>
      );
    }

    if (librarySession) {
      return (
        <LibraryManager
          session={librarySession}
          selectedUnmatchedImageIds={selectedUnmatchedImageIds}
          onSelectUnmatchedImage={handleSelectUnmatchedImage}
          onCreateManualPair={handleCreateManualPair}
          onOpenPair={handleOpenLibraryPair}
          onUnpairPair={handleUnpairPair}
          onDeletePairImages={handleDeletePairImages}
          onAcceptReview={handleAcceptReview}
          onRejectReview={handleRejectReview}
          onDeleteReviewImages={handleDeleteReviewImages}
          onDeleteUnmatchedImage={handleDeleteUnmatchedImage}
          onAddScreenshots={handleAddLibraryScreenshots}
          isAppendingScreenshots={isAppendingScreenshots}
          appendProgress={appendProgress}
          errorMessage={libraryError}
          onDismissError={() => setLibraryError(null)}
          onClearLibrary={() => {
            setLibrarySession(null);
            setLibraryError(null);
            setSelectedUnmatchedImageIds([]);
            setActiveEditorSource(null);
          }}
        />
      );
    }

    if (libraryError) {
      return (
        <div className="bg-background flex h-screen w-screen items-center justify-center px-4">
          <div className="border-border bg-card w-full max-w-lg border-2 p-6">
            <h2 className="text-foreground text-lg font-semibold">Library Analysis Error</h2>
            <p className="text-muted-foreground mt-2 text-sm">{libraryError}</p>
            <div className="mt-4">
              <Button size="sm" onClick={() => setLibraryError(null)}>
                Back to upload
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return <DropZone onImagesLoaded={handleImagesLoaded} />;
  }

  return (
    <EditorLayout
      onAddSecondImage={handleAddSecondImage}
      onSelectFirstLightImage={() => finalizeLightSelection('first')}
      onSelectSecondLightImage={() => finalizeLightSelection('second')}
      onCancelLightSelection={() => finalizeLightSelection('cancel')}
      onExportComplete={handleExportComplete}
      isLibraryMode={activeEditorSource?.mode === 'library'}
    />
  );
}
