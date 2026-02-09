import type {LightImageSide} from '@/features/editor/state/types';

export function orderBySidePreference(lightImage: string, darkImage: string, side: LightImageSide) {
  if (side === 'left') {
    return {image1: lightImage, image2: darkImage};
  }
  return {image1: darkImage, image2: lightImage};
}

export function normalizeTemplateName(name: string): string {
  return name.trim();
}

export function createTemplateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `tmpl_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
