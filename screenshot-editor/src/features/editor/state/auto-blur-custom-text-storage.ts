import {readJson, writeJson} from '@/features/editor/state/storage/local-storage';

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
  return sanitizeCustomTextEntries(readJson<unknown>(AUTO_BLUR_CUSTOM_TEXT_STORAGE_KEY, []));
}

export function saveAutoBlurCustomTexts(entries: string[]): void {
  writeJson(AUTO_BLUR_CUSTOM_TEXT_STORAGE_KEY, sanitizeCustomTextEntries(entries));
}
