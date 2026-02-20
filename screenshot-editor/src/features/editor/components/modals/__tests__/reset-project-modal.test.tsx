import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it} from 'vitest';
import {ResetProjectModal} from '@/features/editor/components/modals/reset-project-modal';
import {RESET_PROJECT_SKIP_CONFIRMATION_STORAGE_KEY} from '@/features/editor/state/reset-project-confirmation-storage';
import {useEditorStore} from '@/features/editor/state/use-editor-store';

describe('ResetProjectModal', () => {
  it('focuses Continue button on open', async () => {
    useEditorStore.setState({
      image1: 'img-1',
      isEditing: true,
      showResetProjectModal: true,
    });

    render(<ResetProjectModal />);

    await waitFor(() => {
      expect(screen.getByRole('button', {name: 'Continue'})).toHaveFocus();
    });
  });

  it('resets the project and persists skip preference when confirmed', async () => {
    const user = userEvent.setup();
    useEditorStore.setState({
      image1: 'img-1',
      image2: 'img-2',
      isEditing: true,
      showResetProjectModal: true,
    });

    render(<ResetProjectModal />);

    await user.click(
      screen.getByRole('button', {name: /skip reset project confirmation next time/i}),
    );
    await user.click(screen.getByRole('button', {name: 'Continue'}));

    expect(useEditorStore.getState().image1).toBeNull();
    expect(useEditorStore.getState().isEditing).toBe(false);
    expect(localStorage.getItem(RESET_PROJECT_SKIP_CONFIRMATION_STORAGE_KEY)).toBe('1');
    expect(screen.queryByText('Start a New Project?')).toBeNull();
  });

  it('cancels reset and closes modal', async () => {
    const user = userEvent.setup();
    useEditorStore.setState({
      image1: 'img-1',
      isEditing: true,
      showResetProjectModal: true,
    });

    render(<ResetProjectModal />);

    await user.click(screen.getByRole('button', {name: 'Cancel'}));

    expect(useEditorStore.getState().image1).toBe('img-1');
    expect(useEditorStore.getState().showResetProjectModal).toBe(false);
  });
});
