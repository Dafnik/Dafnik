import {readJson, writeJson} from '@/features/editor/state/storage/local-storage';

export const AUTO_BLUR_DEFAULTS_STORAGE_KEY = 'editor-auto-blur-defaults-v1';

export interface AutoBlurDefaults {
  email: boolean;
  phone: boolean;
  customEntries: string[];
}

function normalizeCustomEntry(value: string): string {
  return value.trim().toLowerCase();
}

function sanitizeCustomEntries(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const result: string[] = [];
  const seen = new Set<string>();

  for (const entry of value) {
    if (typeof entry !== 'string') continue;
    const normalized = normalizeCustomEntry(entry);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function sanitizeDefaults(value: unknown): AutoBlurDefaults {
  if (!value || typeof value !== 'object') {
    return {email: false, phone: false, customEntries: []};
  }

  const typedValue = value as Partial<AutoBlurDefaults>;

  return {
    email: typedValue.email === true,
    phone: typedValue.phone === true,
    customEntries: sanitizeCustomEntries(typedValue.customEntries),
  };
}

export function loadAutoBlurDefaults(): AutoBlurDefaults {
  return sanitizeDefaults(
    readJson<unknown>(AUTO_BLUR_DEFAULTS_STORAGE_KEY, {
      email: false,
      phone: false,
      customEntries: [],
    }),
  );
}

export function saveAutoBlurDefaults(defaults: AutoBlurDefaults): void {
  writeJson(AUTO_BLUR_DEFAULTS_STORAGE_KEY, sanitizeDefaults(defaults));
}

export function normalizeAutoBlurDefaultCustomEntry(value: string): string {
  return normalizeCustomEntry(value);
}
