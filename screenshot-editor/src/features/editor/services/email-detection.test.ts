import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {detectEmailsInImage} from '@/features/editor/services/email-detection';

const {drawBaseLayerMock, recognizeMock} = vi.hoisted(() => ({
  drawBaseLayerMock: vi.fn(),
  recognizeMock: vi.fn(),
}));

const {createWorkerMock, setParametersMock, terminateMock} = vi.hoisted(() => ({
  createWorkerMock: vi.fn(),
  setParametersMock: vi.fn(),
  terminateMock: vi.fn(),
}));

vi.mock('@/features/editor/hooks/canvas-renderer/layers', () => ({
  drawBaseLayer: drawBaseLayerMock,
}));

vi.mock('tesseract.js', () => ({
  default: {
    createWorker: createWorkerMock,
  },
  createWorker: createWorkerMock,
}));

class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  crossOrigin = '';

  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

describe('detectEmailsInImage', () => {
  beforeEach(() => {
    drawBaseLayerMock.mockReset();
    recognizeMock.mockReset();
    createWorkerMock.mockReset();
    setParametersMock.mockReset();
    terminateMock.mockReset();

    setParametersMock.mockResolvedValue(undefined);
    terminateMock.mockResolvedValue(undefined);
    createWorkerMock.mockResolvedValue({
      setParameters: setParametersMock,
      recognize: recognizeMock,
      terminate: terminateMock,
    });

    vi.stubGlobal('Image', MockImage as unknown as typeof Image);

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
      return {
        clearRect: vi.fn(),
        drawImage: vi.fn(),
      } as unknown as CanvasRenderingContext2D;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('extracts email matches from OCR words and normalizes output', async () => {
    recognizeMock.mockResolvedValue({
      data: {
        words: [
          {text: 'Support@Example.com', bbox: {x0: 12, y0: 20, x1: 112, y1: 40}},
          {text: 'sales@example.com.', bbox: {x0: 30, y0: 60, x1: 140, y1: 82}},
          {text: 'not-an-email', bbox: {x0: 5, y0: 5, x1: 30, y1: 18}},
        ],
      },
    });

    const result = await detectEmailsInImage({
      image1: 'data:image/png;base64,abc',
      image2: null,
      imageWidth: 200,
      imageHeight: 120,
      splitDirection: 'vertical',
      splitRatio: 50,
    });

    expect(result).toEqual([
      {
        email: 'support@example.com',
        box: {x: 12, y: 20, width: 100, height: 20},
      },
      {
        email: 'sales@example.com',
        box: {x: 30, y: 60, width: 110, height: 22},
      },
    ]);
    expect(drawBaseLayerMock).toHaveBeenCalledTimes(1);
    expect(recognizeMock).toHaveBeenCalledTimes(1);
    expect(setParametersMock).toHaveBeenCalled();
    expect(terminateMock).toHaveBeenCalledTimes(1);
  });

  it('ignores non-email words and invalid bounding boxes', async () => {
    recognizeMock.mockResolvedValue({
      data: {
        words: [
          {text: 'hello-world', bbox: {x0: 10, y0: 10, x1: 50, y1: 30}},
          {text: 'admin@example.com', bbox: {x0: 20, y0: 40, x1: 20, y1: 40}},
          {text: 'admin@example.com'},
        ],
      },
    });

    const result = await detectEmailsInImage({
      image1: 'data:image/png;base64,abc',
      image2: null,
      imageWidth: 100,
      imageHeight: 80,
      splitDirection: 'vertical',
      splitRatio: 50,
    });

    expect(result).toEqual([]);
  });

  it('clamps detected boxes to canvas bounds', async () => {
    recognizeMock.mockResolvedValue({
      data: {
        words: [{text: 'edge@example.com', bbox: {x0: -10, y0: -5, x1: 120, y1: 70}}],
      },
    });

    const result = await detectEmailsInImage({
      image1: 'data:image/png;base64,abc',
      image2: null,
      imageWidth: 100,
      imageHeight: 60,
      splitDirection: 'horizontal',
      splitRatio: 60,
    });

    expect(result).toEqual([
      {
        email: 'edge@example.com',
        box: {x: 0, y: 0, width: 100, height: 60},
      },
    ]);
  });

  it('detects emails from OCR lines when words are split tokens', async () => {
    recognizeMock.mockResolvedValue({
      data: {
        words: [
          {text: 'john', bbox: {x0: 20, y0: 20, x1: 50, y1: 36}},
          {text: '@', bbox: {x0: 52, y0: 20, x1: 56, y1: 36}},
          {text: 'example', bbox: {x0: 58, y0: 20, x1: 110, y1: 36}},
          {text: '.com', bbox: {x0: 112, y0: 20, x1: 138, y1: 36}},
        ],
        lines: [{text: 'john @ example .com', bbox: {x0: 20, y0: 20, x1: 138, y1: 36}}],
      },
    });

    const result = await detectEmailsInImage({
      image1: 'data:image/png;base64,abc',
      image2: null,
      imageWidth: 200,
      imageHeight: 120,
      splitDirection: 'vertical',
      splitRatio: 50,
    });

    expect(result).toEqual([
      {
        email: 'john@example.com',
        box: {x: 20, y: 20, width: 118, height: 16},
      },
    ]);
  });

  it('falls back to sparse text mode when the first OCR pass has no matches', async () => {
    recognizeMock
      .mockResolvedValueOnce({
        data: {
          words: [{text: 'no-email-here', bbox: {x0: 10, y0: 10, x1: 60, y1: 24}}],
        },
      })
      .mockResolvedValueOnce({
        data: {
          lines: [{text: 'monitor @ dafnik . me', bbox: {x0: 50, y0: 40, x1: 180, y1: 62}}],
        },
      });

    const result = await detectEmailsInImage({
      image1: 'data:image/png;base64,abc',
      image2: null,
      imageWidth: 220,
      imageHeight: 120,
      splitDirection: 'vertical',
      splitRatio: 50,
    });

    expect(result).toEqual([
      {
        email: 'monitor@dafnik.me',
        box: {x: 50, y: 40, width: 130, height: 22},
      },
    ]);
    expect(setParametersMock).toHaveBeenCalledTimes(2);
    expect(recognizeMock).toHaveBeenCalledTimes(2);
  });
});
