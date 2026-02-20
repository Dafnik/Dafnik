import {useEffect} from 'react';
import {isOpenUploadShortcut, isTypingElement} from '@/features/editor/lib/keyboard';

interface UseOpenUploadShortcutOptions {
  enabled?: boolean;
  onOpen: () => void;
}

export function useOpenUploadShortcut({enabled = true, onOpen}: UseOpenUploadShortcutOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handleShortcut = (event: KeyboardEvent) => {
      if (!isOpenUploadShortcut(event)) return;
      if (isTypingElement(event.target) || isTypingElement(document.activeElement)) return;

      event.preventDefault();
      onOpen();
    };

    window.addEventListener('keydown', handleShortcut, true);
    return () => window.removeEventListener('keydown', handleShortcut, true);
  }, [enabled, onOpen]);
}
