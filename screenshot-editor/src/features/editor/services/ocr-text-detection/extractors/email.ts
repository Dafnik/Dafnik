const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const STRICT_EMAIL_REGEX = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

function normalizeEmailCandidate(candidate: string): string {
  return candidate
    .trim()
    .replace(/^[^A-Z0-9]+|[^A-Z0-9]+$/gi, '')
    .toLowerCase();
}

export function extractEmailsFromText(text: string): string[] {
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

export const OCR_EMAIL_WHITELIST =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@._%+-';
