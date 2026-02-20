import type {MutableRefObject} from 'react';
import {hasPointerCapture, releasePointerCapture, setPointerCapture} from './pointer-capture';

export function isDifferentActivePointer(
  activePointerId: MutableRefObject<number | null>,
  pointerId: number,
): boolean {
  return activePointerId.current !== null && pointerId !== activePointerId.current;
}

export function beginPointerSession(
  activePointerId: MutableRefObject<number | null>,
  element: Element,
  pointerId: number,
): void {
  activePointerId.current = pointerId;
  setPointerCapture(element, pointerId);
}

export function endPointerSession(
  activePointerId: MutableRefObject<number | null>,
  element: Element,
  pointerId: number,
): void {
  activePointerId.current = null;
  releasePointerCapture(element, pointerId);
}

export function cancelPointerSessionIfNeeded(
  activePointerId: MutableRefObject<number | null>,
  element: Element,
  pointerId: number,
): void {
  if (activePointerId.current !== null) {
    releasePointerCapture(element, pointerId);
    activePointerId.current = null;
  }
}

export function isPointerHoverOutsideCapturedSession(element: Element, pointerId: number): boolean {
  return hasPointerCapture(element, pointerId);
}
