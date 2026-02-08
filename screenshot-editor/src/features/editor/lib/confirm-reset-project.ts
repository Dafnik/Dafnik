const RESET_PROJECT_CONFIRM_MESSAGE =
  'Start a new project? Any unsaved changes in the current project will be lost.';

export function confirmResetProject(): boolean {
  if (typeof window === 'undefined') return true;
  if (typeof window.confirm !== 'function') return true;
  return window.confirm(RESET_PROJECT_CONFIRM_MESSAGE);
}
