import {readFlag, writeFlag} from '@/features/editor/state/storage/local-storage';

export const RESET_PROJECT_SKIP_CONFIRMATION_STORAGE_KEY = 'editor-skip-reset-project-modal-v1';

export function loadSkipResetProjectConfirmation(): boolean {
  return readFlag(RESET_PROJECT_SKIP_CONFIRMATION_STORAGE_KEY, false);
}

export function saveSkipResetProjectConfirmation(skip: boolean): void {
  writeFlag(RESET_PROJECT_SKIP_CONFIRMATION_STORAGE_KEY, skip);
}
