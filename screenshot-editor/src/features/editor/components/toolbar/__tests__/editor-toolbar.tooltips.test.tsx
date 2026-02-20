import {act, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it} from 'vitest';
import {EditorLayout} from '@/features/editor/components/layout/editor-layout';
import {formatShortcutTooltip} from '@/features/editor/lib/shortcut-definitions';
import {RESET_PROJECT_SKIP_CONFIRMATION_STORAGE_KEY} from '@/features/editor/state/reset-project-confirmation-storage';
import {useEditorStore} from '@/features/editor/state/use-editor-store';

function renderEditorLayout(isLibraryMode = false) {
  return render(
    <EditorLayout
      onAddSecondImage={() => {}}
      onSelectFirstLightImage={() => {}}
      onSelectSecondLightImage={() => {}}
      onCancelLightSelection={() => {}}
      isLibraryMode={isLibraryMode}
    />,
  );
}

describe('EditorToolbar shortcut tooltips', () => {
  it('shows a shortcut tooltip for New project', async () => {
    const user = userEvent.setup();
    renderEditorLayout();

    const newButton = screen.getByRole('button', {name: /new/i});
    await user.hover(newButton);

    expect(
      await screen.findByRole('tooltip', {
        name: formatShortcutTooltip('New project', ['new-project']),
      }),
    ).toBeInTheDocument();
    expect(newButton).not.toHaveAttribute('title');
  });

  it('shows Back to library label and tooltip in library mode', async () => {
    const user = userEvent.setup();
    renderEditorLayout(true);

    const backButton = screen.getByRole('button', {name: /back to library/i});
    await user.hover(backButton);

    expect(
      await screen.findByRole('tooltip', {
        name: formatShortcutTooltip('Back to library', ['new-project']),
      }),
    ).toBeInTheDocument();
  });

  it('opens custom reset modal from New button when skip preference is disabled', async () => {
    const user = userEvent.setup();
    useEditorStore.setState({image1: 'img-1', isEditing: true});
    renderEditorLayout();

    await user.click(screen.getByRole('button', {name: /new/i}));
    expect(screen.getByText('Start a New Project?')).toBeInTheDocument();
    expect(useEditorStore.getState().image1).toBe('img-1');

    await user.click(screen.getByRole('button', {name: 'Cancel'}));
    expect(screen.queryByText('Start a New Project?')).toBeNull();
    expect(useEditorStore.getState().image1).toBe('img-1');
  });

  it('skips reset modal from New button when preference is enabled', async () => {
    const user = userEvent.setup();
    localStorage.setItem(RESET_PROJECT_SKIP_CONFIRMATION_STORAGE_KEY, '1');
    useEditorStore.setState({image1: 'img-1', isEditing: true});
    renderEditorLayout();

    await user.click(screen.getByRole('button', {name: /new/i}));
    expect(useEditorStore.getState().image1).toBeNull();
    expect(screen.queryByText('Start a New Project?')).toBeNull();
  });

  it('reset settings clears skip preference so New opens confirmation modal again', async () => {
    const user = userEvent.setup();
    localStorage.setItem(RESET_PROJECT_SKIP_CONFIRMATION_STORAGE_KEY, '1');
    useEditorStore.setState({image1: 'img-1', isEditing: true});
    renderEditorLayout();

    act(() => {
      useEditorStore.getState().resetSettingsToDefaults();
    });
    expect(localStorage.getItem(RESET_PROJECT_SKIP_CONFIRMATION_STORAGE_KEY)).toBe('0');

    await user.click(screen.getByRole('button', {name: /new/i}));
    expect(screen.getByText('Start a New Project?')).toBeInTheDocument();
    expect(useEditorStore.getState().image1).toBe('img-1');
  });

  it('shows a shortcut tooltip for zoom input', async () => {
    const user = userEvent.setup();
    renderEditorLayout();

    const zoomInputTrigger = screen.getByTestId('zoom-input-shortcut-trigger');
    await user.hover(zoomInputTrigger);

    expect(
      await screen.findByRole('tooltip', {
        name: formatShortcutTooltip('Zoom', ['zoom', 'zoom-step']),
      }),
    ).toBeInTheDocument();
  });

  it('shows a shortcut tooltip for undo', async () => {
    useEditorStore.setState({canUndo: true, canRedo: true});
    const user = userEvent.setup();
    renderEditorLayout();

    const undoButton = screen.getByRole('button', {name: 'Undo'});
    await user.hover(undoButton);
    expect(
      await screen.findByRole('tooltip', {
        name: formatShortcutTooltip('Undo', ['undo']),
      }),
    ).toBeInTheDocument();
  });

  it('shows a shortcut tooltip for redo', async () => {
    useEditorStore.setState({canUndo: true, canRedo: true});
    const user = userEvent.setup();
    renderEditorLayout();

    const redoButton = screen.getByRole('button', {name: 'Redo'});
    await user.hover(redoButton);
    expect(
      await screen.findByRole('tooltip', {
        name: formatShortcutTooltip('Redo', ['redo']),
      }),
    ).toBeInTheDocument();
  });

  it('shows a shortcut tooltip for export', async () => {
    const user = userEvent.setup();
    renderEditorLayout();

    const exportButton = screen.getByRole('button', {name: /export/i});
    await user.hover(exportButton);
    expect(
      await screen.findByRole('tooltip', {
        name: formatShortcutTooltip('Export', ['export']),
      }),
    ).toBeInTheDocument();
  });

  it('toggles split-view sidebar from toolbar button and updates button variant', async () => {
    const user = userEvent.setup();
    useEditorStore.setState({showSplitViewSidebar: false});
    renderEditorLayout();

    const splitViewButton = screen.getByRole('button', {name: 'Split View'});
    expect(splitViewButton).toHaveClass('bg-transparent');

    await user.click(splitViewButton);
    expect(useEditorStore.getState().showSplitViewSidebar).toBe(true);
    expect(splitViewButton).toHaveClass('bg-primary');

    await user.click(splitViewButton);
    expect(useEditorStore.getState().showSplitViewSidebar).toBe(false);
    expect(splitViewButton).toHaveClass('bg-transparent');
  });
});
