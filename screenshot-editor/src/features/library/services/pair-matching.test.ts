import {describe, expect, it} from 'vitest';
import {buildLibraryPairs} from '@/features/library/services/pair-matching';
import type {LibraryImage} from '@/features/library/types';

function makeHash(fill = 0): Uint8Array {
  return new Uint8Array(32).fill(fill);
}

function makePartialHash(differentBytes: number): Uint8Array {
  const hash = makeHash(0);
  for (let i = 0; i < differentBytes; i += 1) {
    hash[i] = 255;
  }
  return hash;
}

function makeImage(
  id: string,
  fileName: string,
  meanLuminance: number,
  edgeHash: Uint8Array,
  width = 1200,
  height = 900,
): LibraryImage {
  return {
    id,
    fileName,
    dataUrl: `data:${fileName}`,
    features: {
      width,
      height,
      aspectRatio: width / height,
      meanLuminance,
      grayscaleThumbnail: new Uint8ClampedArray(96 * 96),
      edgeMap: new Uint8ClampedArray(96 * 96),
      edgeHash,
    },
  };
}

describe('buildLibraryPairs', () => {
  it('never uses one image in multiple pairs', () => {
    const images = [
      makeImage('d1', 'd1.png', 25, makeHash(0)),
      makeImage('d2', 'd2.png', 30, makeHash(1)),
      makeImage('d3', 'd3.png', 35, makeHash(2)),
      makeImage('l1', 'l1.png', 220, makeHash(0)),
      makeImage('l2', 'l2.png', 210, makeHash(1)),
      makeImage('l3', 'l3.png', 215, makeHash(2)),
    ];

    const result = buildLibraryPairs(images);
    const matchedImageIds = new Set<string>();

    for (const pair of result.autoPairs) {
      expect(matchedImageIds.has(pair.darkImage.id)).toBe(false);
      expect(matchedImageIds.has(pair.lightImage.id)).toBe(false);
      matchedImageIds.add(pair.darkImage.id);
      matchedImageIds.add(pair.lightImage.id);
    }
    for (const review of result.reviewPairs) {
      expect(matchedImageIds.has(review.pair.darkImage.id)).toBe(false);
      expect(matchedImageIds.has(review.pair.lightImage.id)).toBe(false);
      matchedImageIds.add(review.pair.darkImage.id);
      matchedImageIds.add(review.pair.lightImage.id);
    }
  });

  it('chooses the best candidate when one image has near alternatives', () => {
    const images = [
      makeImage('d1', 'dark-a.png', 24, makeHash(0)),
      makeImage('d2', 'dark-b.png', 28, makeHash(3)),
      makeImage('l1', 'light-a.png', 220, makeHash(0)),
      makeImage('l2', 'light-b.png', 215, makeHash(3)),
    ];

    const result = buildLibraryPairs(images);
    const pairIds = result.autoPairs.map((pair) => pair.id);

    expect(pairIds).toContain('d1__l1');
    expect(pairIds).toContain('d2__l2');
  });

  it('routes borderline candidates to review', () => {
    const images = [
      makeImage('d1', 'dark.png', 40, makeHash(0)),
      makeImage('l1', 'light.png', 100, makePartialHash(8)),
    ];

    const result = buildLibraryPairs(images);
    expect(result.autoPairs).toHaveLength(0);
    expect(result.reviewPairs).toHaveLength(1);
    expect(result.reviewPairs[0].pair.reason).toBe('borderline');
    expect(result.unmatchedImageIds).toHaveLength(0);
  });

  it('keeps one image unmatched when image count is odd', () => {
    const images = [
      makeImage('d1', 'dark-1.png', 20, makeHash(0)),
      makeImage('d2', 'dark-2.png', 30, makeHash(1)),
      makeImage('l1', 'light-1.png', 220, makeHash(0)),
      makeImage('l2', 'light-2.png', 230, makeHash(1)),
      makeImage('l3', 'light-3.png', 240, makeHash(2)),
    ];

    const result = buildLibraryPairs(images);
    expect(result.unmatchedImageIds).toHaveLength(1);
  });
});
