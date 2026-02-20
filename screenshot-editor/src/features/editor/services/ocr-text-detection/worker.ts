import {composeBaseImageCanvas, loadImage} from './canvas';
import type {DetectTextInImageOptions, DetectedTextMatch, OcrData, OcrWorker} from './types';

export const OCR_LANG_PATH = 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0';
const OCR_SEGMENTATION_MODES = ['3', '11'] as const;

export async function detectTextInImage(
  options: DetectTextInImageOptions,
  charWhitelist: string,
  collector: (
    data: OcrData,
    imageWidth: number,
    imageHeight: number,
    matches: DetectedTextMatch[],
  ) => void,
): Promise<DetectedTextMatch[]> {
  if (!options.image1 || options.imageWidth <= 0 || options.imageHeight <= 0) {
    return [];
  }

  const [baseImage, secondImage] = await Promise.all([
    loadImage(options.image1),
    options.image2 ? loadImage(options.image2) : Promise.resolve(null),
  ]);

  const canvas = composeBaseImageCanvas(baseImage, secondImage, options);
  const tesseractModule = await import('tesseract.js');
  const createWorker =
    (tesseractModule as {createWorker?: (...args: unknown[]) => Promise<unknown>}).createWorker ??
    (tesseractModule as {default?: {createWorker?: (...args: unknown[]) => Promise<unknown>}})
      .default?.createWorker;
  if (!createWorker) {
    throw new Error('OCR engine is unavailable.');
  }

  const worker = (await createWorker('eng', 1, {
    langPath: OCR_LANG_PATH,
    gzip: true,
  })) as OcrWorker;

  const matches: DetectedTextMatch[] = [];

  try {
    for (const mode of OCR_SEGMENTATION_MODES) {
      await worker.setParameters({
        tessedit_pageseg_mode: mode,
        tessedit_char_whitelist: charWhitelist,
        preserve_interword_spaces: '1',
      });

      const result = await worker.recognize(canvas);
      collector(result.data ?? {}, options.imageWidth, options.imageHeight, matches);

      if (matches.length > 0) {
        break;
      }
    }
  } finally {
    await worker.terminate();
  }

  return matches;
}
