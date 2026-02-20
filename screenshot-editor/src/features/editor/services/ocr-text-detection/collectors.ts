import type {EmailBoundingBox} from '@/features/editor/lib/email-blur-strokes';
import {boxArea, boxesOverlap, clampBox, getWordBox} from './boxes';
import type {DetectedTextMatch, OcrData} from './types';

export function mergeDetectedMatch(
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

export function collectMatchesFromResult(
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
