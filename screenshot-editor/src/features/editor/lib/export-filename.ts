const TRAILING_SPLIT_SEPARATORS_PATTERN = /[_\-. ]+$/;

function trimTrailingSeparators(value: string): string {
  return value.replace(TRAILING_SPLIT_SEPARATORS_PATTERN, '').trim();
}

export function stripFileExtension(fileName: string): string {
  const trimmed = fileName.trim();
  if (!trimmed) return '';

  const lastDotIndex = trimmed.lastIndexOf('.');
  if (lastDotIndex <= 0) return trimmed;
  return trimmed.slice(0, lastDotIndex);
}

export function deriveSingleImageExportName(fileName: string | null | undefined): string | null {
  if (!fileName) return null;

  const baseName = trimTrailingSeparators(stripFileExtension(fileName));
  return baseName || null;
}

export function deriveSplitExportName(
  firstFileName: string | null | undefined,
  secondFileName: string | null | undefined,
): string | null {
  const firstBase = deriveSingleImageExportName(firstFileName);
  const secondBase = deriveSingleImageExportName(secondFileName);

  if (!firstBase && !secondBase) return null;
  if (!firstBase) return secondBase;
  if (!secondBase) return firstBase;

  const maxPrefixLength = Math.min(firstBase.length, secondBase.length);
  let index = 0;
  while (index < maxPrefixLength && firstBase[index] === secondBase[index]) {
    index += 1;
  }

  if (index === 0) {
    return firstBase;
  }

  const prefix = trimTrailingSeparators(firstBase.slice(0, index));
  return prefix || firstBase;
}
