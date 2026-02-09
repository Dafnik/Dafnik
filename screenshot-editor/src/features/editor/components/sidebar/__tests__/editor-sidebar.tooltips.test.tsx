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
  it('shows switch tool tooltip on tool label', async () => {
    const user = userEvent.setup();
    const {container} = renderEditorLayout();
    const toolGrid = container.querySelector('[data-testid="tool-grid"]');
    expect(toolGrid).toHaveClass('grid', 'grid-cols-2');

    const toolLabel = screen.getByText('Tool');
    await user.hover(toolLabel);
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

    const blurTypeLabel = screen.getByText('Blur Type');
    await user.hover(blurTypeLabel);
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

  it('shows auto-blur emails tooltip', async () => {
    useEditorStore.setState({
      activeTool: 'blur',
      image1: 'data:image/png;base64,xyz',
      imageWidth: 200,
      imageHeight: 100,
    });
    const user = userEvent.setup();
    renderEditorLayout();

    const autoBlurButton = screen.getByRole('button', {name: /auto blur detected emails/i});
    await user.hover(autoBlurButton);

    expect(await screen.findByRole('tooltip', {name: 'Auto blur emails'})).toBeInTheDocument();
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

    const directionLabel = screen.getByText('Direction');
    await user.hover(directionLabel);
    expect(
      await screen.findByRole('tooltip', {
        name: formatShortcutTooltip('Cycle direction', ['cycle-split-direction']),
      }),
    ).toBeInTheDocument();

    const directionButton = screen.getByRole('button', {name: 'Set split direction to vertical'});
    expect(directionButton).not.toHaveAttribute('title');
  });

  it('shows placement tooltip on split placement controls', async () => {
    useEditorStore.setState({image2: 'data:image/png;base64,xyz'});
    const user = userEvent.setup();
    renderEditorLayout();

    const placementLabel = screen.getByText('Placement');
    await user.hover(placementLabel);

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
