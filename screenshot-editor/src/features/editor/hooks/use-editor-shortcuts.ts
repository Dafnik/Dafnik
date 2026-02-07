import {useEffect} from 'react';
import {useEditorStore} from '@/features/editor/state/use-editor-store';

export function useEditorShortcuts() {
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const showBlurOutlines = useEditorStore((state) => state.showBlurOutlines);
  const setShowBlurOutlines = useEditorStore((state) => state.setShowBlurOutlines);

  useEffect(() => {
    const preventBrowserZoom = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
      }
    };

    document.addEventListener('wheel', preventBrowserZoom, {passive: false});
    return () => document.removeEventListener('wheel', preventBrowserZoom);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        (event.key === 'y' || (event.key === 'z' && event.shiftKey))
      ) {
        event.preventDefault();
        redo();
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        setShowBlurOutlines(!showBlurOutlines);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, setShowBlurOutlines, showBlurOutlines]);
}
