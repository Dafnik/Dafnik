import {readFileAsDataUrl} from '@/features/editor/services/file-loading';
import type {ImageFeatures, LibraryImage} from '@/features/library/types';

const DEFAULT_THUMBNAIL_SIZE = 96;
const DEFAULT_CONCURRENCY = 4;
const EDGE_HASH_BITS = 256;
const EDGE_HASH_GRID_SIZE = 16;

export interface ExtractFeaturesOptions {
  thumbnailSize?: number;
  concurrency?: number;
  onProgress?: (processed: number, total: number) => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function makeImageId(file: File, index: number): string {
  return `${index}-${file.name}-${file.size}-${file.lastModified}`;
}

function computeSobelEdgeMap(
  grayscale: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8ClampedArray {
  const edges = new Uint8ClampedArray(width * height);
  if (width < 3 || height < 3) return edges;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;

      const topLeft = grayscale[i - width - 1];
      const top = grayscale[i - width];
      const topRight = grayscale[i - width + 1];
      const left = grayscale[i - 1];
      const right = grayscale[i + 1];
      const bottomLeft = grayscale[i + width - 1];
      const bottom = grayscale[i + width];
      const bottomRight = grayscale[i + width + 1];

      const gx = -topLeft + topRight - 2 * left + 2 * right - bottomLeft + bottomRight;
      const gy = -topLeft - 2 * top - topRight + bottomLeft + 2 * bottom + bottomRight;
      const magnitude = Math.round(Math.sqrt(gx * gx + gy * gy));
      edges[i] = clamp(magnitude, 0, 255);
    }
  }

  return edges;
}

function computeEdgeHash(edgeMap: Uint8ClampedArray, width: number, height: number): Uint8Array {
  const gridValues = new Float32Array(EDGE_HASH_BITS);
  let gridTotal = 0;

  for (let gy = 0; gy < EDGE_HASH_GRID_SIZE; gy += 1) {
    const yStart = Math.floor((gy * height) / EDGE_HASH_GRID_SIZE);
    const yEnd = Math.max(yStart + 1, Math.floor(((gy + 1) * height) / EDGE_HASH_GRID_SIZE));

    for (let gx = 0; gx < EDGE_HASH_GRID_SIZE; gx += 1) {
      const xStart = Math.floor((gx * width) / EDGE_HASH_GRID_SIZE);
      const xEnd = Math.max(xStart + 1, Math.floor(((gx + 1) * width) / EDGE_HASH_GRID_SIZE));

      let sum = 0;
      let count = 0;
      for (let y = yStart; y < yEnd; y += 1) {
        for (let x = xStart; x < xEnd; x += 1) {
          sum += edgeMap[y * width + x];
          count += 1;
        }
      }

      const value = count > 0 ? sum / count : 0;
      const index = gy * EDGE_HASH_GRID_SIZE + gx;
      gridValues[index] = value;
      gridTotal += value;
    }
  }

  const threshold = gridTotal / EDGE_HASH_BITS;
  const bytes = new Uint8Array(EDGE_HASH_BITS / 8);
  for (let bit = 0; bit < EDGE_HASH_BITS; bit += 1) {
    if (gridValues[bit] >= threshold) {
      const byteIndex = Math.floor(bit / 8);
      const bitIndex = 7 - (bit % 8);
      bytes[byteIndex] |= 1 << bitIndex;
    }
  }

  return bytes;
}

export function computeImageFeaturesFromRgba(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): ImageFeatures {
  const pixelCount = Math.max(1, width * height);
  const grayscale = new Uint8ClampedArray(pixelCount);
  let luminanceSum = 0;

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    const offset = pixelIndex * 4;
    const r = rgba[offset];
    const g = rgba[offset + 1];
    const b = rgba[offset + 2];
    const a = rgba[offset + 3] / 255;
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) * a;
    const gray = Math.round(luminance);
    grayscale[pixelIndex] = gray;
    luminanceSum += luminance;
  }

  const edgeMap = computeSobelEdgeMap(grayscale, width, height);
  const edgeHash = computeEdgeHash(edgeMap, width, height);

  return {
    width,
    height,
    aspectRatio: width / Math.max(1, height),
    meanLuminance: luminanceSum / pixelCount,
    grayscaleThumbnail: grayscale,
    edgeMap,
    edgeHash,
  };
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to decode image.'));
    image.src = dataUrl;
  });
}

async function extractSingleImage(
  file: File,
  index: number,
  thumbnailSize: number,
): Promise<LibraryImage> {
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);

  const canvas = document.createElement('canvas');
  canvas.width = thumbnailSize;
  canvas.height = thumbnailSize;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Failed to create canvas context for feature extraction.');
  }

  context.drawImage(image, 0, 0, thumbnailSize, thumbnailSize);
  const rgba = context.getImageData(0, 0, thumbnailSize, thumbnailSize).data;
  const features = computeImageFeaturesFromRgba(rgba, thumbnailSize, thumbnailSize);

  return {
    id: makeImageId(file, index),
    fileName: file.name,
    dataUrl,
    features: {
      ...features,
      width: image.naturalWidth,
      height: image.naturalHeight,
      aspectRatio: image.naturalWidth / Math.max(1, image.naturalHeight),
    },
  };
}

export async function extractFeatures(
  files: File[],
  options: ExtractFeaturesOptions = {},
): Promise<LibraryImage[]> {
  const imageFiles = files.filter((file) => file.type.startsWith('image/'));
  const total = imageFiles.length;
  if (total === 0) return [];

  const thumbnailSize = options.thumbnailSize ?? DEFAULT_THUMBNAIL_SIZE;
  const concurrency = Math.max(1, options.concurrency ?? DEFAULT_CONCURRENCY);
  const results: LibraryImage[] = new Array(total);

  let nextIndex = 0;
  let processed = 0;
  options.onProgress?.(processed, total);

  async function runWorker() {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      if (currentIndex >= total) return;

      const image = await extractSingleImage(imageFiles[currentIndex], currentIndex, thumbnailSize);
      results[currentIndex] = image;
      processed += 1;
      options.onProgress?.(processed, total);
    }
  }

  await Promise.all(Array.from({length: Math.min(concurrency, total)}, () => runWorker()));
  return results;
}
