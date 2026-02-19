import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

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
}));

import {EditorRoot} from '@/features/editor/editor-root';
import {classifyByLuminance} from '@/features/editor/services/image-classification';
import {useEditorStore} from '@/features/editor/state/use-editor-store';
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

describe('EditorRoot library flow', () => {
  beforeEach(() => {
    setViewportWidth(DEFAULT_VIEWPORT_WIDTH);
    vi.mocked(extractFeatures).mockReset();
    vi.mocked(buildLibraryPairs).mockReset();
    vi.mocked(classifyByLuminance).mockReset();
    vi.mocked(classifyByLuminance).mockResolvedValue({
      status: 'resolved',
      lightImage: 'data:light.png',
      darkImage: 'data:dark.png',
    });
  });

  afterEach(() => {
    setViewportWidth(DEFAULT_VIEWPORT_WIDTH);
  });

  it('routes 10+ uploads into library manager and opens selected pair in editor', async () => {
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
    const files = Array.from({length: 10}, (_, index) => createImageFile(`image-${index}.png`));

    await user.upload(input, files);

    expect(await screen.findByText('Screenshot Library Pairing')).toBeInTheDocument();
    expect(extractFeatures).toHaveBeenCalledTimes(1);
    expect(buildLibraryPairs).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', {name: 'Open pair'}));
    expect(await screen.findByText('Screenshot Editor')).toBeInTheDocument();
    const state = useEditorStore.getState();
    expect(state.image1).toBe(lightImage.dataUrl);
    expect(state.image2).toBe(darkImage.dataUrl);
  });

  it('keeps single upload behavior and opens editor directly', async () => {
    const user = userEvent.setup();
    const {container} = render(<EditorRoot />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    await user.upload(input, createImageFile('single.png'));

    expect(await screen.findByText('Screenshot Editor')).toBeInTheDocument();
    expect(classifyByLuminance).not.toHaveBeenCalled();
    expect(extractFeatures).not.toHaveBeenCalled();
  });

  it('keeps pair upload behavior and runs luminance classification', async () => {
    render(<EditorRoot />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const files = [createImageFile('dark.png'), createImageFile('light.png')];

    fireEvent.change(input, {target: {files}});

    await waitFor(() => {
      expect(classifyByLuminance).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText('Screenshot Editor')).toBeInTheDocument();
    expect(extractFeatures).not.toHaveBeenCalled();
  });
});
