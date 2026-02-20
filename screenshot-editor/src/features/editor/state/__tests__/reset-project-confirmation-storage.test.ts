import {describe, expect, it} from 'vitest';
import {
  RESET_PROJECT_SKIP_CONFIRMATION_STORAGE_KEY,
  loadSkipResetProjectConfirmation,
  saveSkipResetProjectConfirmation,
} from '@/features/editor/state/reset-project-confirmation-storage';

describe('reset project confirmation storage', () => {
  it('defaults to not skipping confirmation', () => {
    expect(loadSkipResetProjectConfirmation()).toBe(false);
  });

  it('persists skip preference as 1 or 0', () => {
    saveSkipResetProjectConfirmation(true);
    expect(localStorage.getItem(RESET_PROJECT_SKIP_CONFIRMATION_STORAGE_KEY)).toBe('1');
    expect(loadSkipResetProjectConfirmation()).toBe(true);

    saveSkipResetProjectConfirmation(false);
    expect(localStorage.getItem(RESET_PROJECT_SKIP_CONFIRMATION_STORAGE_KEY)).toBe('0');
    expect(loadSkipResetProjectConfirmation()).toBe(false);
  });
});
