function canUseStorage(): boolean {
  return typeof window !== 'undefined';
}

export function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;

  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson<T>(key: string, value: T): void {
  if (!canUseStorage()) return;

  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures so editing can continue.
  }
}

export function readFlag(key: string, fallback: boolean): boolean {
  if (!canUseStorage()) return fallback;

  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw === '1';
  } catch {
    return fallback;
  }
}

export function writeFlag(key: string, value: boolean): void {
  if (!canUseStorage()) return;

  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    // Ignore storage failures so editing can continue.
  }
}
