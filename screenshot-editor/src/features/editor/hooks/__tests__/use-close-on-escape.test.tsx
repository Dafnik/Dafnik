import {render} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {useCloseOnEscape} from '@/features/editor/hooks/use-close-on-escape';

function Harness({open, onClose}: {open: boolean; onClose: () => void}) {
  useCloseOnEscape(open, onClose);
  return <div>escape-hook</div>;
}

describe('useCloseOnEscape', () => {
  it('closes when open and escape is pressed', () => {
    const onClose = vi.fn();
    render(<Harness open onClose={onClose} />);

    window.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does nothing when closed', () => {
    const onClose = vi.fn();
    render(<Harness open={false} onClose={onClose} />);

    window.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
    expect(onClose).not.toHaveBeenCalled();
  });
});
