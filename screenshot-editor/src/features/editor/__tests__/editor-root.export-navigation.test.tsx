import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

vi.mock('@/features/editor/components/layout/editor-layout', () => ({
  EditorLayout: ({
    onExportComplete,
  }: {
    onExportComplete?: (payload: {leaveAfterExport: boolean}) => void;
  }) => (
    <div>
      <p>Mock Editor Layout</p>
      <button type="button" onClick={() => onExportComplete?.({leaveAfterExport: true})}>
        Mock export and leave
      </button>
      <button type="button" onClick={() => onExportComplete?.({leaveAfterExport: false})}>
        Mock export and stay
      </button>
    </div>
  ),
}));

vi.mock('@/features/editor/services/file-loading', async () => {
  const actual = await vi.importActual<typeof import('@/features/editor/services/file-loading')>(
    '@/features/editor/services/file-loading',
  );
  return {
    ...actual,
    readFileAsDataUrl: vi.fn(async (file: File) => `data:${file.name}`),
    getImageDimensions: vi.fn(async () => ({width: 1200, height: 800})),
  };
});

vi.mock('@/features/editor/services/image-classification', () => ({
  classifyByLuminance: vi.fn(async (first: string, second: string) => ({
    status: 'resolved' as const,
    lightImage: first,
    darkImage: second,
  })),
}));

vi.mock('@/features/library/services/feature-extraction', () => ({
  extractFeatures: vi.fn(),
}));

vi.mock('@/features/library/services/pair-matching', () => ({
  buildLibraryPairs: vi.fn(),
  scoreImagePair: vi.fn(() => ({score: 0.88})),
}));

import {EditorRoot} from '@/features/editor/editor-root';
import {extractFeatures} from '@/features/library/services/feature-extraction';
import {buildLibraryPairs} from '@/features/library/services/pair-matching';
import type {LibraryImage, LibraryPair} from '@/features/library/types';

const DEFAULT_VIEWPORT_WIDTH = 1200;

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
}

function createImageFile(name: string): File {
  return new File([`content:${name}`], name, {type: 'image/png'});
}

function makeLibraryImage(id: string, fileName: string, meanLuminance: number): LibraryImage {
  return {
    id,
    fileName,
    dataUrl: `data:${fileName}`,
    features: {
      width: 1200,
      height: 800,
      aspectRatio: 1.5,
      meanLuminance,
      grayscaleThumbnail: new Uint8ClampedArray(96 * 96),
      edgeMap: new Uint8ClampedArray(96 * 96),
      edgeHash: new Uint8Array(32),
    },
  };
}

function makeAutoPair(darkImage: LibraryImage, lightImage: LibraryImage): LibraryPair {
  return {
    id: `${darkImage.id}__${lightImage.id}`,
    darkImage,
    lightImage,
    score: 0.92,
    status: 'auto',
    reason: 'high match',
    completedAt: null,
  };
}

describe('EditorRoot export return behavior', () => {
  beforeEach(() => {
    setViewportWidth(DEFAULT_VIEWPORT_WIDTH);
    vi.mocked(extractFeatures).mockReset();
    vi.mocked(buildLibraryPairs).mockReset();
  });

  afterEach(() => {
    setViewportWidth(DEFAULT_VIEWPORT_WIDTH);
  });

  it('returns to dropzone after export in direct mode', async () => {
    const user = userEvent.setup();
    const {container} = render(<EditorRoot />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(input, createImageFile('single.png'));
    expect(await screen.findByText('Mock Editor Layout')).toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: 'Mock export and leave'}));
    expect(await screen.findByText('Drop screenshots here')).toBeInTheDocument();
  });

  it('marks a library pair done and returns to library after export', async () => {
    const user = userEvent.setup();
    const darkImage = makeLibraryImage('dark-1', 'dark-1.png', 20);
    const lightImage = makeLibraryImage('light-1', 'light-1.png', 220);
    const autoPair = makeAutoPair(darkImage, lightImage);

    vi.mocked(extractFeatures).mockResolvedValue([darkImage, lightImage]);
    vi.mocked(buildLibraryPairs).mockReturnValue({
      autoPairs: [autoPair],
      reviewPairs: [],
      unmatchedImageIds: [],
      candidates: [],
    });

    const {container} = render(<EditorRoot />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(input, [
      createImageFile('dark-1.png'),
      createImageFile('light-1.png'),
      createImageFile('extra.png'),
    ]);
    expect(await screen.findByText('Screenshot Library Pairing')).toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: 'Open pair'}));
    expect(await screen.findByText('Mock Editor Layout')).toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: 'Mock export and leave'}));
    expect(await screen.findByText('Screenshot Library Pairing')).toBeInTheDocument();
    expect(screen.getByText('Active: 0')).toBeInTheDocument();
    expect(screen.getByText('Done: 1')).toBeInTheDocument();
  });

  it('recomputes non-done pool when adding screenshots from library and keeps done pairs fixed', async () => {
    const user = userEvent.setup();
    const initialDark = makeLibraryImage('dark-1', 'dark-1.png', 20);
    const initialLight = makeLibraryImage('light-1', 'light-1.png', 220);
    const initialPair = makeAutoPair(initialDark, initialLight);
    const appendDark = makeLibraryImage('dark-2', 'dark-2.png', 24);
    const appendLight = makeLibraryImage('light-2', 'light-2.png', 224);
    const appendPair = makeAutoPair(appendDark, appendLight);

    vi.mocked(extractFeatures)
      .mockResolvedValueOnce([initialDark, initialLight])
      .mockResolvedValueOnce([appendDark, appendLight]);
    vi.mocked(buildLibraryPairs)
      .mockReturnValueOnce({
        autoPairs: [initialPair],
        reviewPairs: [],
        unmatchedImageIds: [],
        candidates: [],
      })
      .mockReturnValueOnce({
        autoPairs: [appendPair],
        reviewPairs: [],
        unmatchedImageIds: [],
        candidates: [],
      });

    const {container} = render(<EditorRoot />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, [
      createImageFile('dark-1.png'),
      createImageFile('light-1.png'),
      createImageFile('extra.png'),
    ]);

    await user.click(screen.getByRole('button', {name: 'Open pair'}));
    await user.click(screen.getByRole('button', {name: 'Mock export and leave'}));
    expect(await screen.findByText('Done: 1')).toBeInTheDocument();

    const addInput = screen.getByTestId('library-add-screenshots-input') as HTMLInputElement;
    await user.upload(addInput, [createImageFile('dark-2.png'), createImageFile('light-2.png')]);

    expect(await screen.findByText('Screenshot Library Pairing')).toBeInTheDocument();
    expect(screen.getByText('Done: 1')).toBeInTheDocument();
    expect(screen.getByText('Active: 1')).toBeInTheDocument();
    expect(buildLibraryPairs).toHaveBeenCalledTimes(2);
  });
});
