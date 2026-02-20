import type {BlurStroke, BlurTemplate, NormalizedBlurStroke} from './types';
import {readJson, writeJson} from '@/features/editor/state/storage/local-storage';

export const BLUR_TEMPLATES_STORAGE_KEY = 'editor-blur-templates-v1';

export function loadBlurTemplates(): BlurTemplate[] {
  const parsed = readJson<unknown>(BLUR_TEMPLATES_STORAGE_KEY, []);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isBlurTemplate);
}

export function saveBlurTemplates(templates: BlurTemplate[]): void {
  writeJson(BLUR_TEMPLATES_STORAGE_KEY, templates);
}

export function normalizeStrokesForTemplate(
  strokes: BlurStroke[],
  sourceWidth: number,
  sourceHeight: number,
): NormalizedBlurStroke[] {
  const safeWidth = Math.max(1, sourceWidth);
  const safeHeight = Math.max(1, sourceHeight);
  const referenceSize = Math.max(1, Math.min(safeWidth, safeHeight));

  return strokes.map((stroke) => ({
    points: stroke.points.map((point) => ({
      xRatio: point.x / safeWidth,
      yRatio: point.y / safeHeight,
    })),
    radiusRatio: stroke.radius / referenceSize,
    strength: stroke.strength,
    blurType: stroke.blurType,
    shape: stroke.shape,
  }));
}

export function denormalizeTemplateToStrokes(
  normalizedStrokes: NormalizedBlurStroke[],
  targetWidth: number,
  targetHeight: number,
): BlurStroke[] {
  const safeWidth = Math.max(1, targetWidth);
  const safeHeight = Math.max(1, targetHeight);
  const referenceSize = Math.max(1, Math.min(safeWidth, safeHeight));

  return normalizedStrokes.map((stroke) => ({
    points: stroke.points.map((point) => ({
      x: point.xRatio * safeWidth,
      y: point.yRatio * safeHeight,
    })),
    radius: Math.max(1, stroke.radiusRatio * referenceSize),
    strength: stroke.strength,
    blurType: stroke.blurType,
    shape: stroke.shape ?? 'brush',
  }));
}

function isBlurTemplate(value: unknown): value is BlurTemplate {
  if (!value || typeof value !== 'object') return false;

  const template = value as Partial<BlurTemplate>;
  return (
    typeof template.id === 'string' &&
    typeof template.name === 'string' &&
    typeof template.sourceWidth === 'number' &&
    typeof template.sourceHeight === 'number' &&
    Array.isArray(template.strokes) &&
    typeof template.createdAt === 'string' &&
    typeof template.updatedAt === 'string'
  );
}
