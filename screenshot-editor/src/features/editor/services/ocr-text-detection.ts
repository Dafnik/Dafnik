import type {EmailBoundingBox} from '@/features/editor/lib/email-blur-strokes';
import {drawBaseLayer} from '@/features/editor/hooks/canvas-renderer/layers';
import type {SplitDirection} from '@/features/editor/state/types';

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const STRICT_EMAIL_REGEX = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
const PHONE_REGEX = /(?:\+?\d[\d\s().-]{5,14}\d)/g;

const OCR_LANG_PATH = 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0';
const OCR_EMAIL_WHITELIST = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@._%+-';
const OCR_PHONE_WHITELIST = '0123456789+().- ';
const OCR_GENERAL_WHITELIST =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@._%+-()[]{}:/\\|#&*\'"!?,$;=<>~` ';
const OCR_SEGMENTATION_MODES = ['3', '11'] as const;

export interface DetectTextInImageOptions {
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

export interface DetectedTextMatch {
  text: string;
  box: EmailBoundingBox;
}

interface PhoneWord {
  text: string;
  normalizedText: string;
  standalonePhone: string | null;
  box: EmailBoundingBox;
}

interface WordSegment {
  word: PhoneWord;
  start: number;
  end: number;
}

interface WordRow {
  words: PhoneWord[];
  top: number;
  bottom: number;
}

function normalizeEmailCandidate(candidate: string): string {
  return candidate
    .trim()
    .replace(/^[^A-Z0-9]+|[^A-Z0-9]+$/gi, '')
    .toLowerCase();
}

function normalizePhoneCandidate(candidate: string): string {
  const trimmed = candidate.trim().replace(/^[^\d+]+|[^\d]+$/g, '');
  if (!trimmed) return '';

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 11) {
    if (!digits.startsWith('1')) return '';
  } else if (digits.length !== 10) {
    return '';
  }

  const hasCountryCode = trimmed.startsWith('+');
  return `${hasCountryCode ? '+' : ''}${digits}`;
}

function normalizeLooseText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

function normalizePhoneWordText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
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
    image.onerror = () => reject(new Error('Failed to decode image for OCR text detection.'));
    image.src = dataUrl;
  });
}

function composeBaseImageCanvas(
  image1: HTMLImageElement,
  image2: HTMLImageElement | null,
  options: Pick<
    DetectTextInImageOptions,
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

function extractPhoneCandidatesFromText(text: string): string[] {
  if (!text) return [];

  const rawMatches = text.match(new RegExp(PHONE_REGEX.source, 'g')) ?? [];
  const unique = new Set<string>();

  for (const rawMatch of rawMatches) {
    const phone = normalizePhoneCandidate(rawMatch);
    if (!phone) continue;
    unique.add(phone);
  }

  return [...unique];
}

function extractCustomTextFromText(text: string, query: string): string[] {
  if (!text || !query) return [];

  const normalizedText = normalizeLooseText(text);
  const normalizedQuery = normalizeLooseText(query);
  if (!normalizedText || !normalizedQuery) return [];

  return normalizedText.includes(normalizedQuery) ? [query.trim()] : [];
}

function boxesOverlap(a: EmailBoundingBox, b: EmailBoundingBox): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function boxArea(box: EmailBoundingBox): number {
  return box.width * box.height;
}

function boxContains(container: EmailBoundingBox, candidate: EmailBoundingBox): boolean {
  return (
    candidate.x >= container.x &&
    candidate.y >= container.y &&
    candidate.x + candidate.width <= container.x + container.width &&
    candidate.y + candidate.height <= container.y + container.height
  );
}

function computeIntersectionArea(a: EmailBoundingBox, b: EmailBoundingBox): number {
  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  const width = right - left;
  const height = bottom - top;

  if (width <= 0 || height <= 0) return 0;
  return width * height;
}

function computeIoU(a: EmailBoundingBox, b: EmailBoundingBox): number {
  const intersection = computeIntersectionArea(a, b);
  if (intersection <= 0) return 0;

  const union = boxArea(a) + boxArea(b) - intersection;
  if (union <= 0) return 0;
  return intersection / union;
}

function unionBoxes(boxes: EmailBoundingBox[]): EmailBoundingBox | null {
  if (boxes.length === 0) return null;

  let minX = boxes[0].x;
  let minY = boxes[0].y;
  let maxX = boxes[0].x + boxes[0].width;
  let maxY = boxes[0].y + boxes[0].height;

  for (let index = 1; index < boxes.length; index += 1) {
    const box = boxes[index];
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function computeVerticalOverlapRatio(
  topA: number,
  bottomA: number,
  topB: number,
  bottomB: number,
): number {
  const overlapTop = Math.max(topA, topB);
  const overlapBottom = Math.min(bottomA, bottomB);
  const overlapHeight = overlapBottom - overlapTop;
  if (overlapHeight <= 0) return 0;

  const heightA = bottomA - topA;
  const heightB = bottomB - topB;
  if (heightA <= 0 || heightB <= 0) return 0;

  return overlapHeight / Math.min(heightA, heightB);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function buildWindowSegments(words: PhoneWord[]): {windowText: string; segments: WordSegment[]} {
  const segments: WordSegment[] = [];
  let windowText = '';

  for (let index = 0; index < words.length; index += 1) {
    if (index > 0) {
      windowText += ' ';
    }

    const start = windowText.length;
    windowText += words[index].normalizedText;
    segments.push({
      word: words[index],
      start,
      end: windowText.length,
    });
  }

  return {windowText, segments};
}

function isPhoneBoxTooBroad(box: EmailBoundingBox, imageWidth: number): boolean {
  if (box.height < 6) return true;
  if (box.width > imageWidth * 0.45) return true;
  if (box.width / box.height > 11) return true;
  return false;
}

function isSamePhoneCandidate(a: EmailBoundingBox, b: EmailBoundingBox): boolean {
  if (computeIoU(a, b) >= 0.2) return true;
  if (boxContains(a, b) || boxContains(b, a)) return true;
  return false;
}

function overlapOnSmallerBox(a: EmailBoundingBox, b: EmailBoundingBox): number {
  const intersection = computeIntersectionArea(a, b);
  if (intersection <= 0) return 0;

  const smallerArea = Math.min(boxArea(a), boxArea(b));
  if (smallerArea <= 0) return 0;
  return intersection / smallerArea;
}

function getPhoneDedupeKey(phoneText: string): string {
  const digitsOnly = phoneText.replace(/\D/g, '');
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return digitsOnly.slice(1);
  }
  return digitsOnly;
}

function mergePhoneDetectedMatch(
  matches: DetectedTextMatch[],
  nextText: string,
  nextBox: EmailBoundingBox,
): void {
  const nextDedupeKey = getPhoneDedupeKey(nextText);

  for (let index = 0; index < matches.length; index += 1) {
    const existing = matches[index];
    const existingDedupeKey = getPhoneDedupeKey(existing.text);
    const hasSamePhoneKey = existingDedupeKey === nextDedupeKey;
    const hasStrongGeometricOverlap = overlapOnSmallerBox(existing.box, nextBox) >= 0.9;

    if (!hasSamePhoneKey && !hasStrongGeometricOverlap) continue;
    if (!isSamePhoneCandidate(existing.box, nextBox) && !hasStrongGeometricOverlap) continue;

    if (boxArea(nextBox) < boxArea(existing.box)) {
      matches[index] = {text: nextText, box: nextBox};
    }
    return;
  }

  matches.push({text: nextText, box: nextBox});
}

function groupWordsIntoRows(words: PhoneWord[]): WordRow[] {
  const rows: WordRow[] = [];
  const sortedWords = [...words].sort((a, b) => {
    const yDelta = a.box.y - b.box.y;
    if (Math.abs(yDelta) > 2) return yDelta;
    return a.box.x - b.box.x;
  });

  for (const word of sortedWords) {
    let bestRowIndex = -1;
    let bestOverlap = 0;

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const overlap = computeVerticalOverlapRatio(
        word.box.y,
        word.box.y + word.box.height,
        row.top,
        row.bottom,
      );
      if (overlap >= 0.55 && overlap > bestOverlap) {
        bestOverlap = overlap;
        bestRowIndex = index;
      }
    }

    if (bestRowIndex === -1) {
      rows.push({
        words: [word],
        top: word.box.y,
        bottom: word.box.y + word.box.height,
      });
      continue;
    }

    const row = rows[bestRowIndex];
    row.words.push(word);
    row.top = Math.min(row.top, word.box.y);
    row.bottom = Math.max(row.bottom, word.box.y + word.box.height);
  }

  for (const row of rows) {
    row.words.sort((a, b) => a.box.x - b.box.x);
  }

  return rows;
}

function collectPhoneMatchesFromWordsOnly(
  data: OcrData,
  imageWidth: number,
  imageHeight: number,
  matches: DetectedTextMatch[],
): void {
  const phoneWords = (data.words ?? [])
    .map((word) => {
      const text = typeof word.text === 'string' ? word.text : '';
      const normalizedText = normalizePhoneWordText(text);
      const box = getWordBox(word);
      if (!normalizedText || !box) return null;
      const standalonePhone =
        extractPhoneCandidatesFromText(normalizedText).find(
          (candidate) => candidate.replace(/^\+/, '').length >= 10,
        ) ?? null;

      return {
        text,
        normalizedText,
        standalonePhone,
        box,
      } satisfies PhoneWord;
    })
    .filter((word): word is PhoneWord => word !== null);

  if (phoneWords.length === 0) return;

  const rows = groupWordsIntoRows(phoneWords);
  const phoneRegex = new RegExp(PHONE_REGEX.source, 'g');

  for (const row of rows) {
    if (row.words.length === 0) continue;

    const medianHeight = median(row.words.map((word) => word.box.height));
    const continuityGapLimit = Math.max(14, 0.7 * medianHeight);

    for (let start = 0; start < row.words.length; start += 1) {
      for (let end = start; end < Math.min(row.words.length, start + 4); end += 1) {
        if (end > start) {
          const previous = row.words[end - 1];
          const current = row.words[end];
          const gap = current.box.x - (previous.box.x + previous.box.width);
          if (gap > continuityGapLimit) {
            break;
          }
        }

        const windowWords = row.words.slice(start, end + 1);
        const {windowText, segments} = buildWindowSegments(windowWords);
        if (!windowText) continue;

        phoneRegex.lastIndex = 0;
        let matchResult: RegExpExecArray | null = phoneRegex.exec(windowText);
        while (matchResult) {
          const rawPhone = matchResult[0] ?? '';
          const normalizedPhone = normalizePhoneCandidate(rawPhone);
          if (normalizedPhone) {
            const matchStart = matchResult.index;
            const matchEnd = matchStart + rawPhone.length;
            const participatingSegments = segments.filter(
              (segment) => segment.end > matchStart && segment.start < matchEnd,
            );
            const participatingWords = participatingSegments.map((segment) => segment.word);
            if (
              participatingWords.length > 1 &&
              participatingWords.some((word) => word.standalonePhone !== null)
            ) {
              matchResult = phoneRegex.exec(windowText);
              continue;
            }

            const participatingBoxes = participatingSegments.map((segment) => segment.word.box);

            const union = unionBoxes(participatingBoxes);
            const clampedBox = union ? clampBox(union, imageWidth, imageHeight) : null;
            if (clampedBox && !isPhoneBoxTooBroad(clampedBox, imageWidth)) {
              mergePhoneDetectedMatch(matches, normalizedPhone, clampedBox);
            }
          }

          matchResult = phoneRegex.exec(windowText);
        }
      }
    }
  }
}

function mergeDetectedMatch(
  matches: DetectedTextMatch[],
  nextText: string,
  nextBox: EmailBoundingBox,
): void {
  let hasOverlappingMatch = false;

  for (let index = 0; index < matches.length; index += 1) {
    const existing = matches[index];
    if (existing.text !== nextText) continue;
    if (!boxesOverlap(existing.box, nextBox)) continue;

    hasOverlappingMatch = true;
    if (boxArea(nextBox) < boxArea(existing.box)) {
      matches[index] = {text: nextText, box: nextBox};
    }
  }

  if (!hasOverlappingMatch) {
    matches.push({text: nextText, box: nextBox});
  }
}

function collectMatchesFromResult(
  data: OcrData,
  imageWidth: number,
  imageHeight: number,
  matches: DetectedTextMatch[],
  extractor: (text: string) => string[],
) {
  const words = data.words ?? [];
  const lines = data.lines ?? [];

  for (const word of words) {
    const text = typeof word.text === 'string' ? word.text : '';
    if (!text) continue;

    const box = getWordBox(word);
    if (!box) continue;

    for (const match of extractor(text)) {
      const clampedBox = clampBox(box, imageWidth, imageHeight);
      if (!clampedBox) continue;
      mergeDetectedMatch(matches, match, clampedBox);
    }
  }

  for (const line of lines) {
    const text = typeof line.text === 'string' ? line.text : '';
    if (!text) continue;

    const box = getWordBox({bbox: line.bbox});
    if (!box) continue;

    for (const match of extractor(text)) {
      const clampedBox = clampBox(box, imageWidth, imageHeight);
      if (!clampedBox) continue;
      mergeDetectedMatch(matches, match, clampedBox);
    }
  }
}

async function detectTextInImage(
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

export async function detectEmailsInImage(
  options: DetectTextInImageOptions,
): Promise<DetectedTextMatch[]> {
  return detectTextInImage(options, OCR_EMAIL_WHITELIST, (data, imageWidth, imageHeight, matches) =>
    collectMatchesFromResult(data, imageWidth, imageHeight, matches, extractEmailsFromText),
  );
}

export async function detectPhoneNumbersInImage(
  options: DetectTextInImageOptions,
): Promise<DetectedTextMatch[]> {
  return detectTextInImage(options, OCR_PHONE_WHITELIST, collectPhoneMatchesFromWordsOnly);
}

export async function detectCustomTextInImage(
  options: DetectTextInImageOptions & {query: string},
): Promise<DetectedTextMatch[]> {
  const query = options.query.trim();
  if (!query) return [];

  return detectTextInImage(
    options,
    OCR_GENERAL_WHITELIST,
    (data, imageWidth, imageHeight, matches) =>
      collectMatchesFromResult(data, imageWidth, imageHeight, matches, (text) =>
        extractCustomTextFromText(text, query),
      ),
  );
}
