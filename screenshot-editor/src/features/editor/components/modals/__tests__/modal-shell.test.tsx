import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {ModalShell} from '@/features/editor/components/modals/modal-shell';

describe('ModalShell', () => {
  it('closes on overlay click', () => {
    const onClose = vi.fn();
    render(
      <ModalShell onClose={onClose} overlayAriaLabel="Close modal overlay">
        <div>content</div>
      </ModalShell>,
    );

    fireEvent.click(screen.getByRole('button', {name: 'Close modal overlay'}));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on overlay keyboard activation', () => {
    const onClose = vi.fn();
    render(
      <ModalShell onClose={onClose} overlayAriaLabel="Close modal overlay">
        <div>content</div>
      </ModalShell>,
    );

    fireEvent.keyDown(screen.getByRole('button', {name: 'Close modal overlay'}), {key: 'Enter'});
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
