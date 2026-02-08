import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it} from 'vitest';
import {EditorLayout} from '@/features/editor/components/layout/editor-layout';
import {formatShortcutTooltip} from '@/features/editor/lib/shortcut-definitions';
import {useEditorStore} from '@/features/editor/state/use-editor-store';

function renderEditorLayout() {
  return render(
    <EditorLayout
      onAddSecondImage={() => {}}
      onSelectFirstLightImage={() => {}}
      onSelectSecondLightImage={() => {}}
      onCancelLightSelection={() => {}}
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
});
