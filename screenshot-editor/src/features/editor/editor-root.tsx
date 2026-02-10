import {useCallback, useEffect, useRef, useState} from 'react';
import {DesktopOnlyPage} from '@/components/desktop-only-page';
import {DropZone} from '@/components/drop-zone';
import {EditorLayout} from '@/features/editor/components/layout/editor-layout';
import {useEditorShortcuts} from '@/features/editor/hooks/use-editor-shortcuts';
import {
  deriveSingleImageExportName,
  deriveSplitExportName,
} from '@/features/editor/lib/export-filename';
import {classifyByLuminance} from '@/features/editor/services/image-classification';
import {getImageDimensions} from '@/features/editor/services/file-loading';
import {orderBySidePreference} from '@/features/editor/state/store/helpers';
import {useEditorStore, useEditorStoreApi} from '@/features/editor/state/use-editor-store';
import type {LightSelection} from '@/features/editor/state/types';

const MIN_DESKTOP_WIDTH_PX = 1012;

function getViewportWidth(): number {
  if (typeof window === 'undefined') return MIN_DESKTOP_WIDTH_PX;
  return window.innerWidth;
}

export function EditorRoot() {
  useEditorShortcuts();
  const [viewportWidth, setViewportWidth] = useState(getViewportWidth);

  const isEditing = useEditorStore((state) => state.isEditing);
  const lightImageSide = useEditorStore((state) => state.lightImageSide);
  const openLightSelector = useEditorStore((state) => state.openLightSelector);
  const resolveLightSelector = useEditorStore((state) => state.resolveLightSelector);
  const initializeEditor = useEditorStore((state) => state.initializeEditor);

  const editorStoreApi = useEditorStoreApi();
  const pendingSelectionResolver = useRef<((selection: LightSelection) => void) | null>(null);
  const primaryUploadBaseNameRef = useRef<string | null>(null);

  const requestLightImageSelection = useCallback(
    (firstImage: string, secondImage: string) => {
      return new Promise<LightSelection>((resolve) => {
        pendingSelectionResolver.current = resolve;
        openLightSelector({firstImage, secondImage});
      });
    },
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

  useEffect(() => {
    return () => {
      pendingSelectionResolver.current?.('cancel');
      pendingSelectionResolver.current = null;
    };
  }, []);

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
    (
      inputImage1: string,
      inputImage2: string | null,
      firstFileName: string | null,
      secondFileName: string | null,
    ) => {
      const init = async () => {
        let image1 = inputImage1;
        let image2 = inputImage2;
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
      };

      void init();
    },
    [classifyPair, initializeEditor, lightImageSide],
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
      };

      void addSecond();
    },
    [classifyPair, editorStoreApi],
  );

  if (viewportWidth < MIN_DESKTOP_WIDTH_PX) {
    return <DesktopOnlyPage minWidthPx={MIN_DESKTOP_WIDTH_PX} />;
  }

  if (!isEditing) {
    return <DropZone onImagesLoaded={handleImagesLoaded} />;
  }

  return (
    <EditorLayout
      onAddSecondImage={handleAddSecondImage}
      onSelectFirstLightImage={() => finalizeLightSelection('first')}
      onSelectSecondLightImage={() => finalizeLightSelection('second')}
      onCancelLightSelection={() => finalizeLightSelection('cancel')}
    />
  );
}
