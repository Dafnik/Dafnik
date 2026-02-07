import {describe, expect, it} from 'vitest';
import {
  BLUR_TEMPLATES_STORAGE_KEY,
  loadBlurTemplates,
  saveBlurTemplates,
} from '@/features/editor/state/blur-templates-storage';
import type {BlurTemplate} from '@/features/editor/state/types';

describe('blur template storage', () => {
  it('saves and loads templates from localStorage', () => {
    const templates: BlurTemplate[] = [
      {
        id: 'template-1',
        name: 'Faces',
        sourceWidth: 100,
        sourceHeight: 50,
        strokes: [
          {
            points: [{xRatio: 0.2, yRatio: 0.4}],
            radiusRatio: 0.1,
            strength: 8,
            blurType: 'normal',
          },
        ],
        createdAt: '2026-02-07T00:00:00.000Z',
        updatedAt: '2026-02-07T00:00:00.000Z',
      },
    ];

    saveBlurTemplates(templates);
    expect(loadBlurTemplates()).toEqual(templates);
  });

  it('returns empty array for corrupt payload', () => {
    localStorage.setItem(BLUR_TEMPLATES_STORAGE_KEY, '{bad json');
    expect(loadBlurTemplates()).toEqual([]);
  });
});
