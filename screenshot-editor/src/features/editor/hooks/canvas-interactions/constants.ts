import type {Point} from '@/features/editor/state/types';
import type {SamplingPerfStats} from './types';

export const SPLIT_HANDLE_HIT_RADIUS_PX = 14;
export const RESIZE_HANDLE_HIT_SIZE_PX = 14;
export const MIN_ZOOM = 10;
export const MAX_ZOOM = 500;
export const MIN_POINT_DISTANCE = 0.75;
export const MAX_POINT_DISTANCE = 5;
export const DIRECTION_CHANGE_DOT_THRESHOLD = 0.96;
const CURSOR_EPSILON = 0.25;

export function clampZoom(value: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
}

export function clampZoomFloat(value: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
}

export function normalizeWheelDelta(event: WheelEvent): number {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return event.deltaY * 16;
  }
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return event.deltaY * (typeof window === 'undefined' ? 800 : window.innerHeight);
  }
  return event.deltaY;
}

export function getSamplingPerfStats(): SamplingPerfStats | null {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null;

  const perfTarget = window as unknown as {
    __SCREENSHOT_EDITOR_PERF__?: {sampling?: SamplingPerfStats};
  };
  if (!perfTarget.__SCREENSHOT_EDITOR_PERF__) {
    perfTarget.__SCREENSHOT_EDITOR_PERF__ = {};
  }
  if (!perfTarget.__SCREENSHOT_EDITOR_PERF__.sampling) {
    perfTarget.__SCREENSHOT_EDITOR_PERF__.sampling = {
      acceptedPoints: 0,
      skippedPoints: 0,
    };
  }

  return perfTarget.__SCREENSHOT_EDITOR_PERF__.sampling;
}

export function areCursorPositionsEqual(a: Point | null, b: Point | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  return Math.abs(a.x - b.x) < CURSOR_EPSILON && Math.abs(a.y - b.y) < CURSOR_EPSILON;
}

export function getAdaptiveSamplingDistance(brushRadius: number, zoom: number): number {
  const zoomFactor = 100 / Math.max(zoom, MIN_ZOOM);
  const adaptiveDistance = brushRadius * 0.12 * zoomFactor;
  return Math.min(MAX_POINT_DISTANCE, Math.max(MIN_POINT_DISTANCE, adaptiveDistance));
}
