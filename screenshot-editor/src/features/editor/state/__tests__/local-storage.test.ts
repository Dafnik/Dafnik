import {afterEach, describe, expect, it, vi} from 'vitest';
import {
  readFlag,
  readJson,
  writeFlag,
  writeJson,
} from '@/features/editor/state/storage/local-storage';

describe('local storage helpers', () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('falls back when json is malformed', () => {
    localStorage.setItem('bad-json', '{oops');
    const value = readJson('bad-json', {ok: true});
    expect(value).toEqual({ok: true});
  });

  it('round-trips json and flags', () => {
    writeJson('prefs', {count: 3});
    expect(readJson('prefs', {count: 0})).toEqual({count: 3});

    writeFlag('flag-key', true);
    expect(readFlag('flag-key', false)).toBe(true);
  });
});
