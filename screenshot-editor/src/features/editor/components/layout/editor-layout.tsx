import {useState} from 'react';
import {TooltipProvider} from '@/components/ui/tooltip';
import {EditorCanvasRoot} from '@/features/editor/components/canvas/editor-canvas-root';
import {ExportModal} from '@/features/editor/components/modals/export-modal';
import {LightImageSelectorModal} from '@/features/editor/components/modals/light-image-selector-modal';
import {ShortcutsModal} from '@/features/editor/components/modals/shortcuts-modal';
import {EditorSidebar} from '@/features/editor/components/sidebar/editor-sidebar';
import {SplitViewSidebar} from '@/features/editor/components/sidebar/split-view-sidebar';
import {EditorToolbar} from '@/features/editor/components/toolbar/editor-toolbar';

interface EditorLayoutProps {
  onAddSecondImage: (dataUrl: string, fileName: string | null) => void;
  onSelectFirstLightImage: () => void;
  onSelectSecondLightImage: () => void;
  onCancelLightSelection: () => void;
}

export function EditorLayout({
  onAddSecondImage,
  onSelectFirstLightImage,
  onSelectSecondLightImage,
  onCancelLightSelection,
}: EditorLayoutProps) {
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const [selectedStrokeIndices, setSelectedStrokeIndices] = useState<number[]>([]);

  return (
    <TooltipProvider delayDuration={0} skipDelayDuration={0}>
      <div className="flex h-screen w-screen flex-col">
        <EditorToolbar />

        <div className="flex flex-1 overflow-hidden">
          <EditorSidebar selectedStrokeIndices={selectedStrokeIndices} />
          <EditorCanvasRoot
            onCanvasReady={setCanvasEl}
            onSelectedStrokeIndicesChange={setSelectedStrokeIndices}
          />
          <SplitViewSidebar onAddSecondImage={onAddSecondImage} />
        </div>

        <ExportModal canvasRef={canvasEl} />
        <ShortcutsModal />
        <LightImageSelectorModal
          onSelectFirst={onSelectFirstLightImage}
          onSelectSecond={onSelectSecondLightImage}
          onCancel={onCancelLightSelection}
        />
      </div>
    </TooltipProvider>
  );
}
