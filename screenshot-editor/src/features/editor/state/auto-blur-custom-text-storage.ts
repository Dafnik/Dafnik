export const AUTO_BLUR_CUSTOM_TEXT_STORAGE_KEY = 'editor-auto-blur-custom-text-v1';

function sanitizeCustomTextEntries(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const result: string[] = [];
  const seen = new Set<string>();

  for (const entry of value) {
    if (typeof entry !== 'string') continue;

    const trimmed = entry.trim();
    if (!trimmed) continue;

    const normalized = trimmed.toLowerCase();
    if (seen.has(normalized)) continue;

    seen.add(normalized);
    result.push(trimmed);
  }

  return result;
}

export function loadAutoBlurCustomTexts(): string[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(AUTO_BLUR_CUSTOM_TEXT_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return sanitizeCustomTextEntries(parsed);
  } catch {
    return [];
  }
}

export function saveAutoBlurCustomTexts(entries: string[]): void {
  if (typeof window === 'undefined') return;

  try {
    const sanitized = sanitizeCustomTextEntries(entries);
    localStorage.setItem(AUTO_BLUR_CUSTOM_TEXT_STORAGE_KEY, JSON.stringify(sanitized));
  } catch {
    // Ignore storage errors so editing can continue.
  }
}
