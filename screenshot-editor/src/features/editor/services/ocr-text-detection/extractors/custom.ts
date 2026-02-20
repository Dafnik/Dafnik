function normalizeLooseText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

export function extractCustomTextFromText(text: string, query: string): string[] {
  if (!text || !query) return [];

  const normalizedText = normalizeLooseText(text);
  const normalizedQuery = normalizeLooseText(query);
  if (!normalizedText || !normalizedQuery) return [];

  return normalizedText.includes(normalizedQuery) ? [query.trim()] : [];
}

export const OCR_GENERAL_WHITELIST =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@._%+-()[]{}:/\\\\|#&*\\\'\"!?,$;=<>~` ';
