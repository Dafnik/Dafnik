import {describe, expect, it} from 'vitest';
import {
  AUTO_BLUR_DEFAULTS_STORAGE_KEY,
  loadAutoBlurDefaults,
  saveAutoBlurDefaults,
} from '@/features/editor/state/auto-blur-defaults-storage';

describe('auto blur defaults storage', () => {
  it('defaults all fields to disabled when no data exists', () => {
    expect(loadAutoBlurDefaults()).toEqual({
      email: false,
      phone: false,
      customEntries: [],
    });
  });

  it('sanitizes and dedupes custom entries when saving', () => {
    saveAutoBlurDefaults({
      email: true,
      phone: false,
      customEntries: ['  Account #42 ', 'account #42', '', '  Order-ID  ', 'Order-ID'],
    });

    expect(localStorage.getItem(AUTO_BLUR_DEFAULTS_STORAGE_KEY)).toBe(
      JSON.stringify({
        email: true,
        phone: false,
        customEntries: ['account #42', 'order-id'],
      }),
    );
  });

  it('sanitizes loaded payloads and falls back to disabled defaults', () => {
    localStorage.setItem(
      AUTO_BLUR_DEFAULTS_STORAGE_KEY,
      JSON.stringify({
        email: true,
        phone: 'yes',
        customEntries: [' Value ', 'value', 42, null, ''],
      }),
    );

    expect(loadAutoBlurDefaults()).toEqual({
      email: true,
      phone: false,
      customEntries: ['value'],
    });
  });

  it('handles invalid json payloads', () => {
    localStorage.setItem(AUTO_BLUR_DEFAULTS_STORAGE_KEY, '{invalid-json');

    expect(loadAutoBlurDefaults()).toEqual({
      email: false,
      phone: false,
      customEntries: [],
    });
  });
});
