import {
  readFlag,
  readJson,
  writeFlag,
  writeJson,
} from '@/features/editor/state/storage/local-storage';

export type ExportFormat = 'png' | 'webp' | 'jpg';

export const EXPORT_FORMATS_STORAGE_KEY = 'screenshot-editor-export-formats';
export const EXPORT_LEAVE_AFTER_STORAGE_KEY = 'screenshot-editor-export-leave-after-v1';

const VALID_FORMATS: ExportFormat[] = ['png', 'webp', 'jpg'];

export function loadExportFormats(defaultValue: ExportFormat[] = ['png']): ExportFormat[] {
  const parsed = readJson<unknown>(EXPORT_FORMATS_STORAGE_KEY, defaultValue);
  if (!Array.isArray(parsed) || parsed.length === 0) return defaultValue;

  const valid = parsed.filter((value): value is ExportFormat =>
    typeof value === 'string' ? VALID_FORMATS.includes(value as ExportFormat) : false,
  );

  return valid.length > 0 ? valid : defaultValue;
}

export function saveExportFormats(formats: ExportFormat[]): void {
  writeJson(EXPORT_FORMATS_STORAGE_KEY, formats);
}

export function loadLeaveAfterExport(defaultValue = true): boolean {
  return readFlag(EXPORT_LEAVE_AFTER_STORAGE_KEY, defaultValue);
}

export function saveLeaveAfterExport(enabled: boolean): void {
  writeFlag(EXPORT_LEAVE_AFTER_STORAGE_KEY, enabled);
}
