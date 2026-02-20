import {useCallback, useRef} from 'react';
import type {ChangeEvent} from 'react';
import {useOpenUploadShortcut} from '@/features/editor/hooks/use-open-upload-shortcut';
import {formatShortcutTooltip} from '@/features/editor/lib/shortcut-definitions';
import {readFileAsDataUrl} from '@/features/editor/services/file-loading';
import {useEditorStore} from '@/features/editor/state/use-editor-store';
import {cn} from '@/lib/utils';
import {SplitViewSection} from './editor-sidebar/split-view-section';

interface SplitViewSidebarProps {
  onAddSecondImage: (dataUrl: string, fileName: string | null) => void;
}

export function SplitViewSidebar({onAddSecondImage}: SplitViewSidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const image2 = useEditorStore((state) => state.image2);
  const splitDirection = useEditorStore((state) => state.splitDirection);
  const splitRatio = useEditorStore((state) => state.splitRatio);
  const lightImageSide = useEditorStore((state) => state.lightImageSide);
  const showSplitViewSidebar = useEditorStore((state) => state.showSplitViewSidebar);

  const setSplitRatio = useEditorStore((state) => state.setSplitRatio);
  const setSplitDirection = useEditorStore((state) => state.setSplitDirection);
  const setLightImageSide = useEditorStore((state) => state.setLightImageSide);
  const removeSecondImage = useEditorStore((state) => state.removeSecondImage);

  const handleFileSelect = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      void (async () => {
        try {
          const dataUrl = await readFileAsDataUrl(file);
          onAddSecondImage(dataUrl, file.name);
        } catch {
          // Ignore read failures. User can retry selecting the file.
        }
      })();
      event.target.value = '';
    },
    [onAddSecondImage],
  );

  const uploadDialogTooltip = formatShortcutTooltip('Open file dialog', ['open-upload-dialog']);
  const directionTooltip = formatShortcutTooltip('Cycle direction', ['cycle-split-direction']);
  const placementTooltip = formatShortcutTooltip('Cycle placement', ['toggle-split-placement']);

  useOpenUploadShortcut({
    enabled: !image2,
    onOpen: () => fileInputRef.current?.click(),
  });

  return (
    <aside
      data-testid="split-view-sidebar"
      className={cn(
        'border-border h-full flex-shrink-0 overflow-y-auto transition-[width,border-color] duration-150',
        showSplitViewSidebar ? 'w-72 border-l-2' : 'w-0 border-l-0',
      )}
      style={{background: 'oklch(var(--sidebar-background))'}}
      aria-hidden={!showSplitViewSidebar}>
      <div className={cn(showSplitViewSidebar ? 'w-72' : 'pointer-events-none invisible w-72')}>
        <SplitViewSection
          image2={image2}
          splitDirection={splitDirection}
          splitRatio={splitRatio}
          lightImageSide={lightImageSide}
          uploadDialogTooltip={uploadDialogTooltip}
          directionTooltip={directionTooltip}
          placementTooltip={placementTooltip}
          fileInputRef={fileInputRef}
          onSetSplitDirection={(dir) => setSplitDirection(dir, {commitHistory: true})}
          onSetSplitRatio={(value) => setSplitRatio(value, {debouncedHistory: true})}
          onSetLightImageSide={(side) => setLightImageSide(side, {reorderImages: true})}
          onRemoveSecondImage={removeSecondImage}
        />
      </div>

      <input
        ref={fileInputRef}
        data-testid="split-view-upload-input"
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </aside>
  );
}
