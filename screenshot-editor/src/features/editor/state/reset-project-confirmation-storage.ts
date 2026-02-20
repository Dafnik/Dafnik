export const RESET_PROJECT_SKIP_CONFIRMATION_STORAGE_KEY = 'editor-skip-reset-project-modal-v1';

export function loadSkipResetProjectConfirmation(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    return localStorage.getItem(RESET_PROJECT_SKIP_CONFIRMATION_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveSkipResetProjectConfirmation(skip: boolean): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(RESET_PROJECT_SKIP_CONFIRMATION_STORAGE_KEY, skip ? '1' : '0');
  } catch {
    // Ignore storage errors so editing can continue.
  }
}
