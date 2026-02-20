import {useCallback, useEffect, useRef, type Dispatch, type SetStateAction} from 'react';
import {
  deriveSingleImageExportName,
  deriveSplitExportName,
} from '@/features/editor/lib/export-filename';
import {classifyByLuminance} from '@/features/editor/services/image-classification';
import {getImageDimensions, readFileAsDataUrl} from '@/features/editor/services/file-loading';
import {orderBySidePreference} from '@/features/editor/state/store/helpers';
import type {
  InitializeEditorPayload,
  LightImageSide,
  LightSelection,
} from '@/features/editor/state/types';
import {useEditorStore} from '@/features/editor/state/use-editor-store';
import type {EditorSource} from './use-library-session-controller';

interface UseDirectUploadControllerOptions {
  initializeEditor: (payload: InitializeEditorPayload) => void;
  lightImageSide: LightImageSide;
  setActiveEditorSource: Dispatch<SetStateAction<EditorSource>>;
}

export function useDirectUploadController({
  initializeEditor,
  lightImageSide,
  setActiveEditorSource,
}: UseDirectUploadControllerOptions) {
  const openLightSelector = useEditorStore((state) => state.openLightSelector);
  const resolveLightSelector = useEditorStore((state) => state.resolveLightSelector);
  const pendingSelectionResolver = useRef<((selection: LightSelection) => void) | null>(null);
  const primaryUploadBaseNameRef = useRef<string | null>(null);

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

  const loadDirectFiles = useCallback(
    (files: File[]) => {
      const init = async () => {
        if (files.length === 0) return;

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
    [classifyPair, initializeEditor, lightImageSide, setActiveEditorSource],
  );

  const addSecondImage = useCallback(
    (dataUrl: string, fileName: string | null) => {
      const addSecond = async () => {
        const state = useEditorStore.getState();
        if (!state.image1) return;

        const classified = await classifyPair(state.image1, dataUrl);
        if (!classified) return;

        const ordered = orderBySidePreference(
          classified.lightImage,
          classified.darkImage,
          state.lightImageSide,
        );

        useEditorStore.setState({
          image1: ordered.image1,
          image2: ordered.image2,
          showSplitViewSidebar: true,
        });
        const derivedExportName = deriveSplitExportName(
          primaryUploadBaseNameRef.current ?? state.exportBaseName,
          fileName,
        );
        if (derivedExportName) {
          useEditorStore.getState().setExportBaseName(derivedExportName);
        }
        useEditorStore.getState().pushHistorySnapshot();
        setActiveEditorSource({mode: 'direct'});
      };

      void addSecond();
    },
    [classifyPair, setActiveEditorSource],
  );

  return {
    loadDirectFiles,
    addSecondImage,
    selectFirstLightImage: () => finalizeLightSelection('first'),
    selectSecondLightImage: () => finalizeLightSelection('second'),
    cancelLightSelection: () => finalizeLightSelection('cancel'),
  };
}
