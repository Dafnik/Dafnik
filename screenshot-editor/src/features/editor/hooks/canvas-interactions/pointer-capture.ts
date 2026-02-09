export function releasePointerCapture(element: HTMLDivElement, pointerId: number) {
  if (typeof element.hasPointerCapture !== 'function') return;
  if (typeof element.releasePointerCapture !== 'function') return;
  if (element.hasPointerCapture(pointerId)) {
    element.releasePointerCapture(pointerId);
  }
}

export function setPointerCapture(element: HTMLDivElement, pointerId: number) {
  if (typeof element.setPointerCapture !== 'function') return;
  element.setPointerCapture(pointerId);
}

export function hasPointerCapture(element: HTMLDivElement, pointerId: number) {
  if (typeof element.hasPointerCapture !== 'function') return false;
  return element.hasPointerCapture(pointerId);
}
