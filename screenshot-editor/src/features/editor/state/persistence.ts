import type {
  ActiveTool,
  BlurType,
  LightImageSide,
  PersistedSettings,
  SplitDirection,
} from './types';
import {DEFAULT_SETTINGS} from './types';

export const SETTINGS_STORAGE_KEY = 'editor-settings-v1';
export const LEGACY_MIGRATION_KEY = 'editor-settings-legacy-migrated-v1';

const VALID_SPLIT_DIRECTIONS: SplitDirection[] = [
  'horizontal',
  'vertical',
  'diagonal-tl-br',
  'diagonal-tr-bl',
];
const VALID_ACTIVE_TOOLS: ActiveTool[] = ['select', 'blur'];
const VALID_BLUR_TYPES: BlurType[] = ['normal', 'pixelated'];
const VALID_LIGHT_SIDES: LightImageSide[] = ['left', 'right'];

function readLegacySetting(key: string): string | null {
  try {
    return localStorage.getItem(`editor-${key}`);
  } catch {
    return null;
  }
}

function parseNumber(value: string | null, fallback: number, min: number, max: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

export function loadLegacySettingsOnce(): Partial<PersistedSettings> {
  if (typeof window === 'undefined') return {};

  try {
    if (localStorage.getItem(LEGACY_MIGRATION_KEY) === '1') {
      return {};
    }

    const legacy: Partial<PersistedSettings> = {};

    legacy.splitRatio = parseNumber(
      readLegacySetting('split-ratio'),
      DEFAULT_SETTINGS.splitRatio,
      10,
      90,
    );

    const splitDirection = readLegacySetting('split-direction');
    if (splitDirection && VALID_SPLIT_DIRECTIONS.includes(splitDirection as SplitDirection)) {
      legacy.splitDirection = splitDirection as SplitDirection;
    }

    legacy.brushRadius = parseNumber(
      readLegacySetting('brush-radius'),
      DEFAULT_SETTINGS.brushRadius,
      5,
      100,
    );
    legacy.brushStrength = parseNumber(
      readLegacySetting('brush-strength'),
      DEFAULT_SETTINGS.brushStrength,
      1,
      30,
    );

    const blurType = readLegacySetting('blur-type');
    if (blurType && VALID_BLUR_TYPES.includes(blurType as BlurType)) {
      legacy.blurType = blurType as BlurType;
    }

    const activeTool = readLegacySetting('active-tool');
    if (activeTool && VALID_ACTIVE_TOOLS.includes(activeTool as ActiveTool)) {
      legacy.activeTool = activeTool as ActiveTool;
    }

    const lightImageSide = readLegacySetting('light-image-side');
    if (lightImageSide && VALID_LIGHT_SIDES.includes(lightImageSide as LightImageSide)) {
      legacy.lightImageSide = lightImageSide as LightImageSide;
    }

    legacy.zoom = parseNumber(readLegacySetting('zoom'), DEFAULT_SETTINGS.zoom, 10, 500);

    localStorage.setItem(LEGACY_MIGRATION_KEY, '1');
    return legacy;
  } catch {
    return {};
  }
}

export function getPersistedSettingsSlice(settings: PersistedSettings): PersistedSettings {
  return {
    splitRatio: settings.splitRatio,
    splitDirection: settings.splitDirection,
    brushRadius: settings.brushRadius,
    brushStrength: settings.brushStrength,
    blurType: settings.blurType,
    activeTool: settings.activeTool,
    lightImageSide: settings.lightImageSide,
    zoom: settings.zoom,
  };
}
