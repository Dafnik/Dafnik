import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it} from 'vitest';
import {EditorLayout} from '@/features/editor/components/layout/editor-layout';
import {
  formatShortcutById,
  formatShortcutTooltip,
} from '@/features/editor/lib/shortcut-definitions';
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

describe('EditorSidebar shortcut tooltips', () => {
  it('shows switch tool tooltip on drag/select tool buttons', async () => {
    const user = userEvent.setup();
    const {container} = renderEditorLayout();
    const toolGrid = container.querySelector('[data-testid="tool-grid"]');
    expect(toolGrid).toHaveClass('grid', 'grid-cols-2');

    const dragButton = screen.getByRole('button', {name: /drag/i});
    await user.hover(dragButton);
    expect(
      await screen.findByRole('tooltip', {
        name: formatShortcutTooltip('Switch tool', ['switch-tool']),
      }),
    ).toBeInTheDocument();

    const selectButton = screen.getByRole('button', {name: /select/i});
    await user.hover(selectButton);

    expect(
      await screen.findByRole('tooltip', {
        name: formatShortcutTooltip('Switch tool', ['switch-tool']),
      }),
    ).toBeInTheDocument();
  });

  it('shows blur type tooltip', async () => {
    useEditorStore.setState({activeTool: 'blur'});
    const user = userEvent.setup();
    renderEditorLayout();

    const blurTypeButton = screen.getByRole('button', {name: /normal/i});
    await user.hover(blurTypeButton);
    expect(
      await screen.findByRole('tooltip', {
        name: formatShortcutTooltip('Toggle blur type', ['toggle-blur-type']),
      }),
    ).toBeInTheDocument();
  });

  it('shows outlines tooltip', async () => {
    useEditorStore.setState({activeTool: 'blur'});
    const user = userEvent.setup();
    renderEditorLayout();

    const outlinesButton = screen.getByRole('button', {name: /toggle blur outlines/i});
    await user.hover(outlinesButton);
    expect(
      await screen.findByRole('tooltip', {
        name: formatShortcutTooltip('Toggle outlines', ['toggle-outlines']),
      }),
    ).toBeInTheDocument();
  });

  it('shows reset blurs tooltip', async () => {
    useEditorStore.setState({activeTool: 'blur'});
    const user = userEvent.setup();
    renderEditorLayout();

    const resetButton = screen.getByRole('button', {name: /reset all blurs/i});
    await user.hover(resetButton);

    expect(await screen.findByRole('tooltip', {name: 'Reset all blurs'})).toBeInTheDocument();
  });

  it('shows radius tooltip on label', async () => {
    useEditorStore.setState({activeTool: 'blur'});
    const user = userEvent.setup();
    renderEditorLayout();

    const radiusLabel = screen.getByText('Radius');
    await user.hover(radiusLabel);

    expect(
      await screen.findByRole('tooltip', {
        name: formatShortcutTooltip('Radius +/-', ['radius-step']),
      }),
    ).toBeInTheDocument();
  });

  it('shows split direction tooltip and removes native title on direction buttons', async () => {
    useEditorStore.setState({image2: 'data:image/png;base64,xyz', splitDirection: 'vertical'});
    const user = userEvent.setup();
    renderEditorLayout();

    const directionButton = screen.getByRole('button', {name: 'Set split direction to vertical'});
    await user.hover(directionButton);

    expect(
      await screen.findByRole('tooltip', {
        name: formatShortcutTooltip('Cycle direction', ['cycle-split-direction']),
      }),
    ).toBeInTheDocument();
    expect(directionButton).not.toHaveAttribute('title');
  });

  it('shows placement tooltip on split placement controls', async () => {
    useEditorStore.setState({image2: 'data:image/png;base64,xyz'});
    const user = userEvent.setup();
    renderEditorLayout();

    const placementButton = screen.getByRole('button', {name: /light left/i});
    await user.hover(placementButton);

    expect(
      await screen.findByRole('tooltip', {
        name: formatShortcutTooltip('Cycle placement', ['toggle-split-placement']),
      }),
    ).toBeInTheDocument();
  });

  it('shows shortcuts tooltip and dynamic shortcut label', async () => {
    const user = userEvent.setup();
    renderEditorLayout();

    const shortcutsButton = screen.getByRole('button', {name: /shortcuts/i});
    await user.hover(shortcutsButton);

    expect(
      await screen.findByRole('tooltip', {
        name: formatShortcutTooltip('Shortcuts', ['shortcuts-modal']),
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(formatShortcutById('shortcuts-modal'))).toBeInTheDocument();
  });
});
