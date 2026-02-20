import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {LibraryPairCard} from '@/features/library/components/library-pair-card';
import type {LibraryImage, LibraryPair} from '@/features/library/types';

function makeImage(id: string, luminance: number): LibraryImage {
  return {
    id,
    fileName: `${id}.png`,
    dataUrl: `data:image/png;base64,${id}`,
    features: {
      width: 100,
      height: 80,
      aspectRatio: 1.25,
      meanLuminance: luminance,
      grayscaleThumbnail: new Uint8ClampedArray([0]),
      edgeMap: new Uint8ClampedArray([0]),
      edgeHash: new Uint8Array(32),
    },
  };
}

describe('LibraryPairCard', () => {
  it('renders dark/light previews and actions', () => {
    const dark = makeImage('dark', 30);
    const light = makeImage('light', 210);
    const pair: LibraryPair = {
      id: 'pair-1',
      darkImage: dark,
      lightImage: light,
      score: 0.88,
      status: 'auto',
      reason: 'high match',
      completedAt: null,
    };

    render(
      <LibraryPairCard pair={pair} reasonLabel="borderline" actions={<button>Open</button>} />,
    );

    expect(screen.getByText('borderline')).toBeInTheDocument();
    expect(screen.getByText('Dark: dark.png')).toBeInTheDocument();
    expect(screen.getByText('Light: light.png')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Open'})).toBeInTheDocument();
  });
});
