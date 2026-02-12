import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
  detectCustomTextInImage,
  detectEmailsInImage,
  detectPhoneNumbersInImage,
} from '@/features/editor/services/ocr-text-detection';

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

const baseOptions = {
  image1: 'data:image/png;base64,abc',
  image2: null,
  imageWidth: 200,
  imageHeight: 120,
  splitDirection: 'vertical' as const,
  splitRatio: 50,
};

const phoneOptions = {
  ...baseOptions,
  imageWidth: 320,
};

describe('ocr text detection', () => {
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

  it('extracts email matches and normalizes output text', async () => {
    recognizeMock.mockResolvedValue({
      data: {
        words: [
          {text: 'Support@Example.com', bbox: {x0: 12, y0: 20, x1: 112, y1: 40}},
          {text: 'sales@example.com.', bbox: {x0: 30, y0: 60, x1: 140, y1: 82}},
          {text: 'not-an-email', bbox: {x0: 5, y0: 5, x1: 30, y1: 18}},
        ],
      },
    });

    const result = await detectEmailsInImage(baseOptions);

    expect(result).toEqual([
      {
        text: 'support@example.com',
        box: {x: 12, y: 20, width: 100, height: 20},
      },
      {
        text: 'sales@example.com',
        box: {x: 30, y: 60, width: 110, height: 22},
      },
    ]);
    expect(drawBaseLayerMock).toHaveBeenCalledTimes(1);
    expect(recognizeMock).toHaveBeenCalledTimes(1);
    expect(setParametersMock).toHaveBeenCalled();
    expect(terminateMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to sparse mode on email detection when first pass has no matches', async () => {
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

    const result = await detectEmailsInImage(baseOptions);

    expect(result).toEqual([
      {
        text: 'monitor@dafnik.me',
        box: {x: 50, y: 40, width: 130, height: 22},
      },
    ]);
    expect(setParametersMock).toHaveBeenCalledTimes(2);
    expect(recognizeMock).toHaveBeenCalledTimes(2);
  });

  it('detects split phone numbers across adjacent words', async () => {
    recognizeMock.mockResolvedValue({
      data: {
        words: [
          {text: '(555)', bbox: {x0: 40, y0: 20, x1: 92, y1: 40}},
          {text: '123-4567', bbox: {x0: 95, y0: 20, x1: 170, y1: 40}},
        ],
      },
    });

    const result = await detectPhoneNumbersInImage(phoneOptions);

    expect(result).toEqual([
      {
        text: '5551234567',
        box: {x: 40, y: 20, width: 130, height: 20},
      },
    ]);
  });

  it('ignores line-only phone matches when no usable word windows exist', async () => {
    recognizeMock.mockResolvedValue({
      data: {
        words: [{text: 'Call us tomorrow', bbox: {x0: 20, y0: 20, x1: 160, y1: 40}}],
        lines: [{text: 'Call (555) 123-4567 now', bbox: {x0: 0, y0: 18, x1: 200, y1: 42}}],
      },
    });

    const result = await detectPhoneNumbersInImage(phoneOptions);

    expect(result).toEqual([]);
  });

  it('keeps phone boxes tight even when surrounding words are present', async () => {
    recognizeMock.mockResolvedValue({
      data: {
        words: [
          {text: 'Call', bbox: {x0: 20, y0: 30, x1: 54, y1: 50}},
          {text: '(555)', bbox: {x0: 60, y0: 30, x1: 110, y1: 50}},
          {text: '123-4567', bbox: {x0: 114, y0: 30, x1: 192, y1: 50}},
          {text: 'for', bbox: {x0: 198, y0: 30, x1: 224, y1: 50}},
          {text: 'help', bbox: {x0: 228, y0: 30, x1: 262, y1: 50}},
        ],
      },
    });

    const result = await detectPhoneNumbersInImage(phoneOptions);

    expect(result).toEqual([
      {
        text: '5551234567',
        box: {x: 60, y: 30, width: 132, height: 20},
      },
    ]);
  });

  it('dedupes overlapping same-phone matches and keeps the smaller box', async () => {
    recognizeMock.mockResolvedValue({
      data: {
        words: [
          {text: 'Call(555)123-4567', bbox: {x0: 20, y0: 30, x1: 200, y1: 50}},
          {text: '(555)', bbox: {x0: 80, y0: 30, x1: 126, y1: 50}},
          {text: '123-4567', bbox: {x0: 126, y0: 30, x1: 196, y1: 50}},
        ],
      },
    });

    const result = await detectPhoneNumbersInImage({
      ...phoneOptions,
      imageWidth: 500,
    });

    expect(result).toEqual([
      {
        text: '5551234567',
        box: {x: 80, y: 30, width: 116, height: 20},
      },
    ]);
  });

  it('dedupes overlapping +1 and local variants into one tight box', async () => {
    recognizeMock.mockResolvedValue({
      data: {
        words: [
          {text: '+1', bbox: {x0: 22, y0: 30, x1: 42, y1: 50}},
          {text: '(555)', bbox: {x0: 48, y0: 30, x1: 95, y1: 50}},
          {text: '123-4567', bbox: {x0: 98, y0: 30, x1: 172, y1: 50}},
        ],
      },
    });

    const result = await detectPhoneNumbersInImage(phoneOptions);

    expect(result).toEqual([
      {
        text: '5551234567',
        box: {x: 48, y: 30, width: 124, height: 20},
      },
    ]);
  });

  it('matches custom text flexibly across casing and whitespace', async () => {
    recognizeMock.mockResolvedValue({
      data: {
        lines: [{text: 'Customer   ID\n123', bbox: {x0: 18, y0: 34, x1: 150, y1: 50}}],
      },
    });

    const result = await detectCustomTextInImage({...baseOptions, query: 'customer id 123'});

    expect(result).toEqual([
      {
        text: 'customer id 123',
        box: {x: 18, y: 34, width: 132, height: 16},
      },
    ]);
  });

  it('returns early for empty custom text query', async () => {
    const result = await detectCustomTextInImage({...baseOptions, query: '   '});

    expect(result).toEqual([]);
    expect(createWorkerMock).not.toHaveBeenCalled();
  });

  it('clamps detected boxes to canvas bounds', async () => {
    recognizeMock.mockResolvedValue({
      data: {
        words: [{text: 'edge@example.com', bbox: {x0: -10, y0: -5, x1: 220, y1: 170}}],
      },
    });

    const result = await detectEmailsInImage(baseOptions);

    expect(result).toEqual([
      {
        text: 'edge@example.com',
        box: {x: 0, y: 0, width: 200, height: 120},
      },
    ]);
  });
});
