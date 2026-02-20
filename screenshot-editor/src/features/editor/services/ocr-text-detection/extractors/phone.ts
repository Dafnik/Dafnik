import type {EmailBoundingBox} from '@/features/editor/lib/email-blur-strokes';
import {
  boxArea,
  boxContains,
  clampBox,
  computeIoU,
  overlapOnSmallerBox,
  unionBoxes,
  getWordBox,
} from '../boxes';
import type {DetectedTextMatch, OcrData, PhoneWord, WordRow, WordSegment} from '../types';

const PHONE_REGEX = /(?:\+?\d[\d\s().-]{5,14}\d)/g;

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

function normalizePhoneWordText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
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

export function collectPhoneMatchesFromWordsOnly(
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

export const OCR_PHONE_WHITELIST = '0123456789+().- ';
