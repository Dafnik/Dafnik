import {useState} from 'react';
import {EditorCanvasRoot} from '@/features/editor/components/canvas/editor-canvas-root';
import {ExportModal} from '@/features/editor/components/modals/export-modal';
import {LightImageSelectorModal} from '@/features/editor/components/modals/light-image-selector-modal';
import {EditorSidebar} from '@/features/editor/components/sidebar/editor-sidebar';
import {EditorToolbar} from '@/features/editor/components/toolbar/editor-toolbar';

interface EditorLayoutProps {
  onAddSecondImage: (dataUrl: string) => void;
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

  return (
    <div className="flex h-screen w-screen flex-col">
      <EditorToolbar />

      <div className="flex flex-1 overflow-hidden">
        <EditorSidebar onAddSecondImage={onAddSecondImage} />
        <EditorCanvasRoot onCanvasReady={setCanvasEl} />
      </div>

      <ExportModal canvasRef={canvasEl} />
      <LightImageSelectorModal
        onSelectFirst={onSelectFirstLightImage}
        onSelectSecond={onSelectSecondLightImage}
        onCancel={onCancelLightSelection}
      />
    </div>
  );
}
