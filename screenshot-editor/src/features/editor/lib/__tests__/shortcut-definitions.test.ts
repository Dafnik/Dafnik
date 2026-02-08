import {describe, expect, it} from 'vitest';
import {
  formatShortcutById,
  formatShortcutKeys,
  formatShortcutTooltip,
  getModifierKeyLabel,
} from '@/features/editor/lib/shortcut-definitions';

describe('shortcut-definitions', () => {
  it('formats modifier key as Ctrl on non-mac platforms', () => {
    expect(getModifierKeyLabel({platform: 'Win32'})).toBe('Ctrl');
    expect(formatShortcutKeys('MOD+N', {platform: 'Linux x86_64'})).toBe('Ctrl+N');
  });

  it('formats modifier key as Cmd on mac-like platforms', () => {
    expect(getModifierKeyLabel({platform: 'MacIntel'})).toBe('Cmd');
    expect(formatShortcutKeys('MOD+N', {platform: 'iPhone'})).toBe('Cmd+N');
  });

  it('builds shortcut text by id and tooltip copy', () => {
    expect(formatShortcutById('redo', {platform: 'MacIntel'})).toBe('Cmd+Y / Cmd+Shift+Z');
    expect(formatShortcutById('toggle-split-placement', {platform: 'Win32'})).toBe('Ctrl+P');
    expect(formatShortcutById('load-template-slot', {platform: 'MacIntel'})).toBe('Cmd+1-9');
    expect(formatShortcutById('load-template-slot', {platform: 'Win32'})).toBe('Ctrl+1-9');
    expect(formatShortcutTooltip('Zoom', ['zoom', 'zoom-step'], {platform: 'Win32'})).toBe(
      'Zoom · Scroll | Ctrl+←/→',
    );
  });
});
