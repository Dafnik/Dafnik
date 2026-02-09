import {describe, expect, it} from 'vitest';
import {
  deriveSingleImageExportName,
  deriveSplitExportName,
  stripFileExtension,
} from '@/features/editor/lib/export-filename';

describe('export filename helpers', () => {
  it('strips file extensions from uploaded names', () => {
    expect(stripFileExtension('screenshot_1_dark.png')).toBe('screenshot_1_dark');
    expect(stripFileExtension('archive.name.with.dots.webp')).toBe('archive.name.with.dots');
  });

  it('uses single-image base name as export default', () => {
    expect(deriveSingleImageExportName('capture-light.jpg')).toBe('capture-light');
  });

  it('derives split export name from shared prefix and trims separators', () => {
    expect(deriveSplitExportName('screenshot_1_dark.png', 'screenshot_1_light.png')).toBe(
      'screenshot_1',
    );
  });

  it('falls back to first base name when split names have no shared prefix', () => {
    expect(deriveSplitExportName('first-view.png', 'second-view.png')).toBe('first-view');
  });
});
