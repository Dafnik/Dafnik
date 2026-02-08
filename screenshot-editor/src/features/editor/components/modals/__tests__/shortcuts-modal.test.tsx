import {act, fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it} from 'vitest';
import {EditorLayout} from '@/features/editor/components/layout/editor-layout';
import {ShortcutsModal} from '@/features/editor/components/modals/shortcuts-modal';
import {useEditorStore} from '@/features/editor/state/use-editor-store';

describe('ShortcutsModal', () => {
  it('renders nothing when closed', () => {
    render(<ShortcutsModal />);
    expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
  });

  it('opens via store action and closes on close button, backdrop, and escape', () => {
    render(<ShortcutsModal />);

    act(() => {
      useEditorStore.getState().openShortcutsModal();
    });
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', {name: 'Close shortcuts modal button'}));
    expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();

    act(() => {
      useEditorStore.getState().openShortcutsModal();
    });
    fireEvent.click(screen.getByRole('button', {name: 'Close shortcuts modal'}));
    expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();

    act(() => {
      useEditorStore.getState().openShortcutsModal();
    });
    fireEvent.keyDown(window, {key: 'Escape'});
    expect(screen.queryByText('Keyboard Shortcuts')).not.toBeInTheDocument();
  });

  it('opens via shortcuts button in sidebar', async () => {
    const user = userEvent.setup();

    render(
      <EditorLayout
        onAddSecondImage={() => {}}
        onSelectFirstLightImage={() => {}}
        onSelectSecondLightImage={() => {}}
        onCancelLightSelection={() => {}}
      />,
    );

    await user.click(screen.getByRole('button', {name: /Shortcuts/i}));
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
  });
});
