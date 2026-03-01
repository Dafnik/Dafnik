import {useEffect, useState} from 'react';
import {Button} from '@/components/ui/button';
import {DesktopOnlyPage} from '@/components/desktop-only-page';
import {DropZone} from '@/components/drop-zone';
import {EditorLayout} from '@/features/editor/components/layout/editor-layout';
import {useDirectUploadController} from '@/features/editor/hooks/use-direct-upload-controller';
import {useEditorShortcuts} from '@/features/editor/hooks/use-editor-shortcuts';
import {
  type EditorSource,
  useLibrarySessionController,
} from '@/features/editor/hooks/use-library-session-controller';
import {useEditorStore} from '@/features/editor/state/use-editor-store';
import {LibraryManager} from '@/features/library/components/library-manager';

const MIN_DESKTOP_WIDTH_PX = 1012;

function getViewportWidth(): number {
  if (typeof window === 'undefined') return MIN_DESKTOP_WIDTH_PX;
  return window.innerWidth;
}

export function EditorRoot() {
  useEditorShortcuts();
  const [viewportWidth, setViewportWidth] = useState(getViewportWidth);
  const [activeEditorSource, setActiveEditorSource] = useState<EditorSource>(null);

  const isEditing = useEditorStore((state) => state.isEditing);
  const lightImageSide = useEditorStore((state) => state.lightImageSide);
  const initializeEditor = useEditorStore((state) => state.initializeEditor);
  const resetProject = useEditorStore((state) => state.resetProject);

  const library = useLibrarySessionController({
    lightImageSide,
    initializeEditor,
    setActiveEditorSource,
  });

  const directUpload = useDirectUploadController({
    initializeEditor,
    lightImageSide,
    setActiveEditorSource,
  });

  useEffect(() => {
    const handleResize = () => setViewportWidth(getViewportWidth());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleImagesLoaded = (files: File[]) => {
    if (files.length > 2) {
      library.analyzeLibraryFiles(files);
      return;
    }

    library.resetForDirectMode();
    library.setLibraryError(null);
    directUpload.loadDirectFiles(files);
  };

  const handleExportComplete = ({leaveAfterExport}: {leaveAfterExport: boolean}) => {
    library.markExportedPairComplete(activeEditorSource);

    if (leaveAfterExport) {
      setActiveEditorSource(null);
      resetProject();
    }
  };

  if (viewportWidth < MIN_DESKTOP_WIDTH_PX) {
    return <DesktopOnlyPage minWidthPx={MIN_DESKTOP_WIDTH_PX} />;
  }

  if (!isEditing) {
    if (library.analysisProgress) {
      return (
        <div className="bg-background flex h-screen w-screen items-center justify-center px-4">
          <div className="border-border bg-card w-full max-w-lg border-2 p-6 text-center">
            <h2 className="text-foreground text-lg font-semibold">Analyzing Screenshot Library</h2>
            <p className="text-muted-foreground mt-2 text-sm">
              analyzing {library.analysisProgress.processed}/{library.analysisProgress.total}
            </p>
          </div>
        </div>
      );
    }

    if (library.librarySession) {
      return (
        <LibraryManager
          session={library.librarySession}
          selectedUnmatchedImageIds={library.selectedUnmatchedImageIds}
          onSelectUnmatchedImage={library.selectUnmatchedImage}
          onCreateManualPair={library.createManualPair}
          onOpenPair={library.openLibraryPair}
          onUnpairPair={library.unpairPair}
          onDeletePairImages={library.deletePairImages}
          onAcceptReview={library.acceptReview}
          onRejectReview={library.rejectReview}
          onDeleteReviewImages={library.deleteReviewImages}
          onDeleteUnmatchedImage={library.deleteUnmatchedImage}
          onAddScreenshots={library.addLibraryScreenshots}
          isAppendingScreenshots={library.isAppendingScreenshots}
          appendProgress={library.appendProgress}
          autoMatchThresholdPercent={library.autoMatchThresholdPercent}
          onAutoMatchThresholdPercentChange={library.updateAutoMatchThresholdPercent}
          errorMessage={library.libraryError}
          onDismissError={() => library.setLibraryError(null)}
          onClearLibrary={library.clearLibrary}
        />
      );
    }

    if (library.libraryError) {
      return (
        <div className="bg-background flex h-screen w-screen items-center justify-center px-4">
          <div className="border-border bg-card w-full max-w-lg border-2 p-6">
            <h2 className="text-foreground text-lg font-semibold">Library Analysis Error</h2>
            <p className="text-muted-foreground mt-2 text-sm">{library.libraryError}</p>
            <div className="mt-4">
              <Button size="sm" onClick={() => library.setLibraryError(null)}>
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
      onAddSecondImage={directUpload.addSecondImage}
      onSelectFirstLightImage={directUpload.selectFirstLightImage}
      onSelectSecondLightImage={directUpload.selectSecondLightImage}
      onCancelLightSelection={directUpload.cancelLightSelection}
      onExportComplete={handleExportComplete}
      isLibraryMode={activeEditorSource?.mode === 'library'}
    />
  );
}
