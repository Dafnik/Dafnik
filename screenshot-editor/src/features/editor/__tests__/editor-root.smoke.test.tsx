import {render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {EditorRoot} from '@/features/editor/editor-root';

const DEFAULT_VIEWPORT_WIDTH = 1200;

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
}

describe('EditorRoot', () => {
  afterEach(() => {
    setViewportWidth(DEFAULT_VIEWPORT_WIDTH);
  });

  it('renders the drop zone by default', () => {
    setViewportWidth(DEFAULT_VIEWPORT_WIDTH);
    render(<EditorRoot />);
    expect(screen.getByText('Drop screenshots here')).toBeInTheDocument();
  });

  it('renders desktop-only notice when viewport is smaller than 1012px', () => {
    setViewportWidth(1000);
    render(<EditorRoot />);

    expect(screen.getByText('Screenshot Editor is desktop only')).toBeInTheDocument();
    expect(screen.queryByText('Drop screenshots here')).not.toBeInTheDocument();
  });
});
