import {describe, expect, it} from 'vitest';
import {
  denormalizeTemplateToStrokes,
  normalizeStrokesForTemplate,
} from '@/features/editor/state/blur-templates-storage';
import type {BlurStroke} from '@/features/editor/state/types';

describe('blur template scaling', () => {
  it('normalizes and denormalizes strokes proportionally', () => {
    const strokes: BlurStroke[] = [
      {
        points: [
          {x: 20, y: 40},
          {x: 120, y: 80},
        ],
        radius: 16,
        strength: 10,
        blurType: 'normal',
      },
    ];

    const normalized = normalizeStrokesForTemplate(strokes, 200, 100);
    const scaled = denormalizeTemplateToStrokes(normalized, 400, 200);

    expect(scaled).toHaveLength(1);
    expect(scaled[0].points[0].x).toBeCloseTo(40);
    expect(scaled[0].points[0].y).toBeCloseTo(80);
    expect(scaled[0].points[1].x).toBeCloseTo(240);
    expect(scaled[0].points[1].y).toBeCloseTo(160);
    expect(scaled[0].radius).toBeCloseTo(32);
    expect(scaled[0].strength).toBe(10);
    expect(scaled[0].blurType).toBe('normal');
  });

  it('keeps radius at least 1 on very small target sizes', () => {
    const normalized = [
      {
        points: [{xRatio: 0.5, yRatio: 0.5}],
        radiusRatio: 0.00001,
        strength: 5,
        blurType: 'pixelated' as const,
      },
    ];

    const scaled = denormalizeTemplateToStrokes(normalized, 10, 10);
    expect(scaled[0].radius).toBe(1);
  });
});
