import {collectMatchesFromResult} from './collectors';
import {extractCustomTextFromText, OCR_GENERAL_WHITELIST} from './extractors/custom';
import {extractEmailsFromText, OCR_EMAIL_WHITELIST} from './extractors/email';
import {collectPhoneMatchesFromWordsOnly, OCR_PHONE_WHITELIST} from './extractors/phone';
import {detectTextInImage} from './worker';
import type {DetectTextInImageOptions, DetectedTextMatch} from './types';

export type {DetectTextInImageOptions, DetectedTextMatch} from './types';

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
