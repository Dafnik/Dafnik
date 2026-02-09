import {useState} from 'react';
import {TooltipProvider} from '@/components/ui/tooltip';
import {EditorCanvasRoot} from '@/features/editor/components/canvas/editor-canvas-root';
import {ExportModal} from '@/features/editor/components/modals/export-modal';
import {LightImageSelectorModal} from '@/features/editor/components/modals/light-image-selector-modal';
import {ShortcutsModal} from '@/features/editor/components/modals/shortcuts-modal';
import {BlurTemplatePanel} from '@/features/editor/components/sidebar/blur-template-panel';
import {EditorSidebar} from '@/features/editor/components/sidebar/editor-sidebar';
import {EditorToolbar} from '@/features/editor/components/toolbar/editor-toolbar';
import {useEditorStore} from '@/features/editor/state/use-editor-store';

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
  const showTemplatePanel = useEditorStore((state) => state.showTemplatePanel);

  return (
    <TooltipProvider delayDuration={0} skipDelayDuration={0}>
      <div className="flex h-screen w-screen flex-col">
        <EditorToolbar />

        <div className="flex flex-1 overflow-hidden">
          <EditorSidebar
            onAddSecondImage={onAddSecondImage}
            selectedStrokeIndices={selectedStrokeIndices}
          />
          <EditorCanvasRoot
            onCanvasReady={setCanvasEl}
            onSelectedStrokeIndicesChange={setSelectedStrokeIndices}
          />
          {showTemplatePanel && <BlurTemplatePanel />}
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
