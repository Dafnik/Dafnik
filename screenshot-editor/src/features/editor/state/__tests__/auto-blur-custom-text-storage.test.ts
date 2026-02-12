import {describe, expect, it} from 'vitest';
import {
  AUTO_BLUR_CUSTOM_TEXT_STORAGE_KEY,
  loadAutoBlurCustomTexts,
  saveAutoBlurCustomTexts,
} from '@/features/editor/state/auto-blur-custom-text-storage';

describe('auto blur custom text storage', () => {
  it('sanitizes and dedupes values when saving', () => {
    saveAutoBlurCustomTexts(['  Account #42  ', 'account #42', '', 'Order-ID', 'Order-ID  ']);

    expect(localStorage.getItem(AUTO_BLUR_CUSTOM_TEXT_STORAGE_KEY)).toBe(
      JSON.stringify(['Account #42', 'Order-ID']),
    );
  });

  it('sanitizes loaded values and preserves first seen casing', () => {
    localStorage.setItem(
      AUTO_BLUR_CUSTOM_TEXT_STORAGE_KEY,
      JSON.stringify(['  Hello ', 'hello', 42, '', 'World']),
    );

    expect(loadAutoBlurCustomTexts()).toEqual(['Hello', 'World']);
  });

  it('returns empty array for invalid payloads', () => {
    localStorage.setItem(AUTO_BLUR_CUSTOM_TEXT_STORAGE_KEY, '{invalid-json');
    expect(loadAutoBlurCustomTexts()).toEqual([]);

    localStorage.setItem(AUTO_BLUR_CUSTOM_TEXT_STORAGE_KEY, JSON.stringify({value: 'x'}));
    expect(loadAutoBlurCustomTexts()).toEqual([]);
  });
});
