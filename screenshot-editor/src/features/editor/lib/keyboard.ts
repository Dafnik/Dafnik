export function normalizeKey(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key;
}

export function isLetterKey(event: KeyboardEvent, letter: string): boolean {
  const normalizedLetter = letter.toLowerCase();
  return (
    normalizeKey(event.key) === normalizedLetter ||
    event.code === `Key${normalizedLetter.toUpperCase()}`
  );
}

export function isArrowLeft(event: KeyboardEvent): boolean {
  return event.key === 'ArrowLeft' || event.code === 'ArrowLeft';
}

export function isArrowRight(event: KeyboardEvent): boolean {
  return event.key === 'ArrowRight' || event.code === 'ArrowRight';
}

export function isSlashShortcut(event: KeyboardEvent): boolean {
  return event.code === 'Slash' || event.key === '/' || event.key === '?';
}

export function getTemplateSlotIndex(event: KeyboardEvent): number | null {
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

export function isTypingElement(target: EventTarget | null): boolean {
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

export function isOpenUploadShortcut(event: KeyboardEvent): boolean {
  return (
    (event.ctrlKey || event.metaKey) && (normalizeKey(event.key) === 'u' || event.code === 'KeyU')
  );
}
