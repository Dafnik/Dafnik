import {useEffect} from 'react';
import type {SplitDirection} from '@/features/editor/state/types';
import {confirmResetProject} from '@/features/editor/lib/confirm-reset-project';
import {useEditorStore} from '@/features/editor/state/use-editor-store';

const BRUSH_RADIUS_STEP = 1;
const BRUSH_STRENGTH_STEP = 1;
const ZOOM_STEP = 10;
const BRUSH_RADIUS_MIN = 5;
const BRUSH_RADIUS_MAX = 100;
const BRUSH_STRENGTH_MIN = 1;
const BRUSH_STRENGTH_MAX = 30;
const ZOOM_MIN = 10;
const ZOOM_MAX = 500;
const BLUR_TOOL_ORDER = ['select', 'blur'] as const;
const BLUR_TYPE_ORDER = ['normal', 'pixelated'] as const;
const SPLIT_DIRECTION_ORDER: SplitDirection[] = [
  'vertical',
  'horizontal',
  'diagonal-tl-br',
  'diagonal-tr-bl',
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeKey(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key;
}

function isLetterKey(event: KeyboardEvent, letter: string): boolean {
  const normalizedLetter = letter.toLowerCase();
  return (
    normalizeKey(event.key) === normalizedLetter ||
    event.code === `Key${normalizedLetter.toUpperCase()}`
  );
}

function isArrowLeft(event: KeyboardEvent): boolean {
  return event.key === 'ArrowLeft' || event.code === 'ArrowLeft';
}

function isArrowRight(event: KeyboardEvent): boolean {
  return event.key === 'ArrowRight' || event.code === 'ArrowRight';
}

function isSlashShortcut(event: KeyboardEvent): boolean {
  return event.code === 'Slash' || event.key === '/' || event.key === '?';
}

function getTemplateSlotIndex(event: KeyboardEvent): number | null {
  const codeMatch = /^Digit([1-9])$/.exec(event.code);
  if (codeMatch) {
    return Number(codeMatch[1]) - 1;
  }

  if (/^[1-9]$/.test(event.key)) {
    return Number(event.key) - 1;
  }

  return null;
}

function isTextInputType(type: string): boolean {
  return ['text', 'search', 'url', 'tel', 'password', 'email', 'number'].includes(type);
}

function isTypingElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  const nearest = target.closest<HTMLElement>(
    'input, textarea, select, [contenteditable=""], [contenteditable="true"]',
  );
  if (!nearest) return false;

  if (nearest.isContentEditable) return true;
  if (nearest instanceof HTMLTextAreaElement || nearest instanceof HTMLSelectElement) return true;
  if (nearest instanceof HTMLInputElement) {
    return isTextInputType((nearest.type || 'text').toLowerCase());
  }

  return false;
}

export function useEditorShortcuts() {
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
    const pressedKeys = new Set<string>();

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = normalizeKey(event.key);
      pressedKeys.add(key);
      if (event.code) {
        pressedKeys.add(event.code);
      }

      const hasModifier = event.ctrlKey || event.metaKey;
      const isTyping = isTypingElement(event.target) || isTypingElement(document.activeElement);
      const store = useEditorStore.getState();

      if (hasModifier && isSlashShortcut(event)) {
        event.preventDefault();
        store.toggleShortcutsModal();
        return;
      }

      if (!hasModifier || isTyping) return;

      const templateSlotIndex = getTemplateSlotIndex(event);
      if (templateSlotIndex !== null) {
        event.preventDefault();
        const template = store.blurTemplates[templateSlotIndex];
        if (!template) return;

        store.setTemplatePanelOpen(true);
        store.loadBlurTemplate(template.id);
        return;
      }

      if (isLetterKey(event, 'z') && !event.shiftKey) {
        event.preventDefault();
        store.undo();
        return;
      }

      if (isLetterKey(event, 'y') || (isLetterKey(event, 'z') && event.shiftKey)) {
        event.preventDefault();
        store.redo();
        return;
      }

      if (isLetterKey(event, 'r') || isLetterKey(event, 's') || isLetterKey(event, 'n')) {
        event.preventDefault();
        if (isLetterKey(event, 'n')) {
          if (confirmResetProject()) {
            store.resetProject();
          }
        }
        return;
      }

      if (
        isArrowLeft(event) ||
        isArrowRight(event) ||
        isLetterKey(event, 'j') ||
        isLetterKey(event, 'k')
      ) {
        const isPositive = isArrowRight(event) || isLetterKey(event, 'k');
        const delta = isPositive ? 1 : -1;

        if (pressedKeys.has('r') || pressedKeys.has('KeyR')) {
          event.preventDefault();
          store.setBrushRadius(
            clamp(
              store.brushRadius + delta * BRUSH_RADIUS_STEP,
              BRUSH_RADIUS_MIN,
              BRUSH_RADIUS_MAX,
            ),
          );
          return;
        }

        if (pressedKeys.has('s') || pressedKeys.has('KeyS')) {
          event.preventDefault();
          store.setBrushStrength(
            clamp(
              store.brushStrength + delta * BRUSH_STRENGTH_STEP,
              BRUSH_STRENGTH_MIN,
              BRUSH_STRENGTH_MAX,
            ),
          );
          return;
        }

        if (isArrowLeft(event) || isArrowRight(event)) {
          event.preventDefault();
          store.setZoom(clamp(store.zoom + delta * ZOOM_STEP, ZOOM_MIN, ZOOM_MAX));
          return;
        }
      }

      if (isLetterKey(event, 'd')) {
        event.preventDefault();
        const currentIndex = SPLIT_DIRECTION_ORDER.indexOf(store.splitDirection);
        const nextDirection =
          currentIndex < 0
            ? SPLIT_DIRECTION_ORDER[0]
            : SPLIT_DIRECTION_ORDER[(currentIndex + 1) % SPLIT_DIRECTION_ORDER.length];
        store.setSplitDirection(nextDirection, {commitHistory: true});
        return;
      }

      if (isLetterKey(event, 'p')) {
        event.preventDefault();
        const nextSide = store.lightImageSide === 'left' ? 'right' : 'left';
        store.setLightImageSide(nextSide, {reorderImages: true});
        return;
      }

      if (isLetterKey(event, 'o')) {
        event.preventDefault();
        store.setShowBlurOutlines(!store.showBlurOutlines);
        return;
      }

      if (isLetterKey(event, 'b')) {
        event.preventDefault();
        const currentIndex = BLUR_TYPE_ORDER.indexOf(store.blurType);
        const nextType =
          currentIndex < 0
            ? BLUR_TYPE_ORDER[0]
            : BLUR_TYPE_ORDER[(currentIndex + 1) % BLUR_TYPE_ORDER.length];
        store.setBlurType(nextType);
        return;
      }

      if (isLetterKey(event, 't')) {
        event.preventDefault();
        const currentIndex = BLUR_TOOL_ORDER.indexOf(store.activeTool);
        const nextTool =
          currentIndex < 0
            ? BLUR_TOOL_ORDER[0]
            : BLUR_TOOL_ORDER[(currentIndex + 1) % BLUR_TOOL_ORDER.length];
        store.setActiveTool(nextTool);
        return;
      }

      if (isLetterKey(event, 'e')) {
        event.preventDefault();
        store.openExportModal();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      pressedKeys.delete(normalizeKey(event.key));
      if (event.code) {
        pressedKeys.delete(event.code);
      }
    };

    const clearPressedKeys = () => {
      pressedKeys.clear();
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    window.addEventListener('blur', clearPressedKeys);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      window.removeEventListener('blur', clearPressedKeys);
    };
  }, []);
}
