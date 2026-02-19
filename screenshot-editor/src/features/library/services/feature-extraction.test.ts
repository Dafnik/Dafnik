import {describe, expect, it} from 'vitest';
import {computeImageFeaturesFromRgba} from '@/features/library/services/feature-extraction';

function createSolidRgba(width: number, height: number, value: number): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    const offset = i * 4;
    pixels[offset] = value;
    pixels[offset + 1] = value;
    pixels[offset + 2] = value;
    pixels[offset + 3] = 255;
  }
  return pixels;
}

function drawRect(
  pixels: Uint8ClampedArray,
  width: number,
  xStart: number,
  yStart: number,
  xEnd: number,
  yEnd: number,
  value: number,
) {
  for (let y = yStart; y < yEnd; y += 1) {
    for (let x = xStart; x < xEnd; x += 1) {
      const offset = (y * width + x) * 4;
      pixels[offset] = value;
      pixels[offset + 1] = value;
      pixels[offset + 2] = value;
      pixels[offset + 3] = 255;
    }
  }
}

function buildLayoutRgba(
  width: number,
  height: number,
  background: number,
  foreground: number,
  variant: 'base' | 'different',
): Uint8ClampedArray {
  const pixels = createSolidRgba(width, height, background);

  if (variant === 'different') {
    drawRect(pixels, width, 6, 6, 20, height - 6, foreground);
    drawRect(pixels, width, 28, 10, 44, height - 10, foreground);
    drawRect(pixels, width, 48, 16, width - 6, height - 16, foreground);
    return pixels;
  }

  drawRect(pixels, width, 4, 6, width - 4, 10, foreground);
  drawRect(pixels, width, 6, 14, width - 8, 20, foreground);
  drawRect(pixels, width, 6, 24, width - 14, 29, foreground);
  drawRect(pixels, width, 8, 34, width - 24, 40, foreground);

  return pixels;
}

function hammingDistance(first: Uint8Array, second: Uint8Array): number {
  let distance = 0;
  for (let i = 0; i < first.length; i += 1) {
    let value = first[i] ^ second[i];
    while (value > 0) {
      distance += value & 1;
      value >>= 1;
    }
  }
  return distance;
}

function edgeHashSimilarity(first: Uint8Array, second: Uint8Array): number {
  return 1 - hammingDistance(first, second) / 256;
}

describe('computeImageFeaturesFromRgba', () => {
  it('keeps edge hash highly similar for same layout in dark/light themes', () => {
    const width = 64;
    const height = 64;
    const darkPixels = buildLayoutRgba(width, height, 20, 210, 'base');
    const lightPixels = buildLayoutRgba(width, height, 230, 40, 'base');

    const darkFeatures = computeImageFeaturesFromRgba(darkPixels, width, height);
    const lightFeatures = computeImageFeaturesFromRgba(lightPixels, width, height);

    expect(edgeHashSimilarity(darkFeatures.edgeHash, lightFeatures.edgeHash)).toBeGreaterThan(0.85);
  });

  it('produces lower edge similarity for different page layouts', () => {
    const width = 64;
    const height = 64;
    const baseLayout = buildLayoutRgba(width, height, 20, 210, 'base');
    const differentLayout = buildLayoutRgba(width, height, 20, 210, 'different');

    const firstFeatures = computeImageFeaturesFromRgba(baseLayout, width, height);
    const secondFeatures = computeImageFeaturesFromRgba(differentLayout, width, height);

    expect(edgeHashSimilarity(firstFeatures.edgeHash, secondFeatures.edgeHash)).toBeLessThan(0.8);
  });
});
