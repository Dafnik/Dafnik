import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {EditorRoot} from '@/features/editor/editor-root';

describe('EditorRoot', () => {
  it('renders the drop zone by default', () => {
    render(<EditorRoot />);
    expect(screen.getByText('Drop screenshots here')).toBeInTheDocument();
  });
});
