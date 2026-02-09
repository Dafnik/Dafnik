import {drawBaseLayer} from '@/features/editor/hooks/canvas-renderer/layers';
import type {SplitDirection} from '@/features/editor/state/types';
import type {EmailBoundingBox} from '@/features/editor/lib/email-blur-strokes';

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const STRICT_EMAIL_REGEX = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
const OCR_LANG_PATH = 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0';
const OCR_EMAIL_WHITELIST = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@._%+-';
const OCR_SEGMENTATION_MODES = ['3', '11'] as const;

interface DetectEmailsInImageOptions {
  image1: string;
  image2: string | null;
  imageWidth: number;
  imageHeight: number;
  splitDirection: SplitDirection;
  splitRatio: number;
}

interface OcrWord {
  text?: unknown;
  bbox?: {
    x0?: unknown;
    y0?: unknown;
    x1?: unknown;
    y1?: unknown;
    x?: unknown;
    y?: unknown;
    w?: unknown;
    h?: unknown;
    width?: unknown;
    height?: unknown;
  };
}

interface OcrLine {
  text?: unknown;
  bbox?: OcrWord['bbox'];
}

interface OcrData {
  words?: OcrWord[];
  lines?: OcrLine[];
}

interface OcrWorker {
  setParameters: (params: Record<string, string>) => Promise<unknown>;
  recognize: (image: HTMLCanvasElement) => Promise<{data?: OcrData}>;
  terminate: () => Promise<unknown>;
}

export interface DetectedEmail {
  email: string;
  box: EmailBoundingBox;
}

function normalizeEmailCandidate(candidate: string): string {
  return candidate
    .trim()
    .replace(/^[^A-Z0-9]+|[^A-Z0-9]+$/gi, '')
    .toLowerCase();
}

function toNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

function getWordBox(word: OcrWord): EmailBoundingBox | null {
  const bbox = word.bbox;
  if (!bbox) return null;

  const x0 = toNumber(bbox.x0);
  const y0 = toNumber(bbox.y0);
  const x1 = toNumber(bbox.x1);
  const y1 = toNumber(bbox.y1);
  if (x0 !== null && y0 !== null && x1 !== null && y1 !== null) {
    const width = x1 - x0;
    const height = y1 - y0;
    if (width > 0 && height > 0) {
      return {x: x0, y: y0, width, height};
    }
  }

  const x = toNumber(bbox.x);
  const y = toNumber(bbox.y);
  const w = toNumber(bbox.w) ?? toNumber(bbox.width);
  const h = toNumber(bbox.h) ?? toNumber(bbox.height);
  if (x !== null && y !== null && w !== null && h !== null && w > 0 && h > 0) {
    return {x, y, width: w, height: h};
  }

  return null;
}

function clampBox(
  box: EmailBoundingBox,
  maxWidth: number,
  maxHeight: number,
): EmailBoundingBox | null {
  const x = Math.max(0, Math.min(maxWidth, box.x));
  const y = Math.max(0, Math.min(maxHeight, box.y));
  const right = Math.max(0, Math.min(maxWidth, box.x + box.width));
  const bottom = Math.max(0, Math.min(maxHeight, box.y + box.height));
  const width = right - x;
  const height = bottom - y;

  if (width <= 0 || height <= 0) return null;
  return {x, y, width, height};
}

async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to decode image for email detection.'));
    image.src = dataUrl;
  });
}

function composeBaseImageCanvas(
  image1: HTMLImageElement,
  image2: HTMLImageElement | null,
  options: Pick<
    DetectEmailsInImageOptions,
    'imageWidth' | 'imageHeight' | 'splitDirection' | 'splitRatio'
  >,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = options.imageWidth;
  canvas.height = options.imageHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to create image composition context.');
  }

  drawBaseLayer(ctx, options.imageWidth, options.imageHeight, {
    image1,
    image2,
    hasSecondImage: Boolean(image2),
    splitDirection: options.splitDirection,
    splitRatio: options.splitRatio,
  });

  return canvas;
}

function extractEmailsFromText(text: string): string[] {
  if (!text) return [];

  // OCR can split punctuation/email tokens with spaces (e.g. "john @ acme . com"),
  // so compact whitespace before matching.
  const compactText = text.replace(/\s+/g, '');
  const rawMatches = compactText.match(new RegExp(EMAIL_REGEX.source, 'gi')) ?? [];
  const unique = new Set<string>();

  for (const rawMatch of rawMatches) {
    const email = normalizeEmailCandidate(rawMatch);
    if (!email || !STRICT_EMAIL_REGEX.test(email)) continue;
    unique.add(email);
  }

  return [...unique];
}

function collectMatchesFromResult(
  data: OcrData,
  imageWidth: number,
  imageHeight: number,
  seen: Set<string>,
  matches: DetectedEmail[],
) {
  const words = data.words ?? [];
  const lines = data.lines ?? [];

  for (const word of words) {
    const text = typeof word.text === 'string' ? word.text : '';
    if (!text) continue;

    const box = getWordBox(word);
    if (!box) continue;

    for (const email of extractEmailsFromText(text)) {
      const clampedBox = clampBox(box, imageWidth, imageHeight);
      if (!clampedBox) continue;

      const key = `${email}:${Math.round(clampedBox.x)}:${Math.round(clampedBox.y)}:${Math.round(clampedBox.width)}:${Math.round(clampedBox.height)}`;
      if (seen.has(key)) continue;

      seen.add(key);
      matches.push({
        email,
        box: clampedBox,
      });
    }
  }

  for (const line of lines) {
    const text = typeof line.text === 'string' ? line.text : '';
    if (!text) continue;

    const box = getWordBox({bbox: line.bbox});
    if (!box) continue;

    for (const email of extractEmailsFromText(text)) {
      const clampedBox = clampBox(box, imageWidth, imageHeight);
      if (!clampedBox) continue;

      const key = `${email}:${Math.round(clampedBox.x)}:${Math.round(clampedBox.y)}:${Math.round(clampedBox.width)}:${Math.round(clampedBox.height)}`;
      if (seen.has(key)) continue;

      seen.add(key);
      matches.push({
        email,
        box: clampedBox,
      });
    }
  }
}

export async function detectEmailsInImage(
  options: DetectEmailsInImageOptions,
): Promise<DetectedEmail[]> {
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

  const seen = new Set<string>();
  const matches: DetectedEmail[] = [];
  try {
    for (const mode of OCR_SEGMENTATION_MODES) {
      await worker.setParameters({
        tessedit_pageseg_mode: mode,
        tessedit_char_whitelist: OCR_EMAIL_WHITELIST,
        preserve_interword_spaces: '1',
      });

      const result = await worker.recognize(canvas);
      collectMatchesFromResult(
        result.data ?? {},
        options.imageWidth,
        options.imageHeight,
        seen,
        matches,
      );

      if (matches.length > 0) {
        break;
      }
    }
  } finally {
    await worker.terminate();
  }

  return matches;
}
