import {describe, expect, it} from 'vitest';
import {
  getSplitHandlePoint,
  getSplitLineSegment,
  getSplitRatioFromPoint,
} from '@/features/editor/lib/split-geometry';

describe('split geometry', () => {
  it('returns correct vertical and horizontal line segments', () => {
    const vertical = getSplitLineSegment(200, 100, 'vertical', 0.25);
    expect(vertical.start).toEqual({x: 50, y: 0});
    expect(vertical.end).toEqual({x: 50, y: 100});

    const horizontal = getSplitLineSegment(200, 100, 'horizontal', 0.75);
    expect(horizontal.start).toEqual({x: 0, y: 75});
    expect(horizontal.end).toEqual({x: 200, y: 75});
  });

  it('returns clipped diagonal line segments for both diagonal directions', () => {
    const tlbr = getSplitLineSegment(100, 50, 'diagonal-tl-br', 0.25);
    expect(tlbr.start).toEqual({x: 50, y: 0});
    expect(tlbr.end).toEqual({x: 0, y: 25});

    const trbl = getSplitLineSegment(100, 50, 'diagonal-tr-bl', 0.75);
    expect(trbl.start).toEqual({x: 0, y: 25});
    expect(trbl.end).toEqual({x: 50, y: 50});
  });

  it('computes handle point at line midpoint', () => {
    const point = getSplitHandlePoint(120, 80, 'vertical', 0.5);
    expect(point).toEqual({x: 60, y: 40});
  });

  it('maps points back to ratios for every direction', () => {
    expect(getSplitRatioFromPoint(30, 40, 100, 100, 'vertical')).toBeCloseTo(0.3);
    expect(getSplitRatioFromPoint(30, 40, 100, 100, 'horizontal')).toBeCloseTo(0.4);

    expect(getSplitRatioFromPoint(100, 20, 100, 100, 'diagonal-tl-br')).toBeCloseTo(0.6);
    expect(getSplitRatioFromPoint(70, 40, 100, 100, 'diagonal-tr-bl')).toBeCloseTo(0.35);
  });

  it('clamps mapped ratio to the valid range', () => {
    expect(getSplitRatioFromPoint(-20, 50, 100, 100, 'vertical')).toBe(0);
    expect(getSplitRatioFromPoint(150, 50, 100, 100, 'vertical')).toBe(1);
  });
});
