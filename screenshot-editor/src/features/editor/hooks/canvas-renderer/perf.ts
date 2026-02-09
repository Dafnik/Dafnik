export interface RenderPerfStats {
  frameCount: number;
  committedRebuilds: number;
  totalRenderMs: number;
  lastRenderMs: number;
}

export function getRenderPerfStats(): RenderPerfStats | null {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null;

  const perfTarget = window as unknown as {
    __SCREENSHOT_EDITOR_PERF__?: {renderer?: RenderPerfStats};
  };
  if (!perfTarget.__SCREENSHOT_EDITOR_PERF__) {
    perfTarget.__SCREENSHOT_EDITOR_PERF__ = {};
  }
  if (!perfTarget.__SCREENSHOT_EDITOR_PERF__.renderer) {
    perfTarget.__SCREENSHOT_EDITOR_PERF__.renderer = {
      frameCount: 0,
      committedRebuilds: 0,
      totalRenderMs: 0,
      lastRenderMs: 0,
    };
  }

  return perfTarget.__SCREENSHOT_EDITOR_PERF__.renderer;
}
