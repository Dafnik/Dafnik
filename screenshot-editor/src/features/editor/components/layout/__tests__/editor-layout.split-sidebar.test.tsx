import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {EditorLayout} from '@/features/editor/components/layout/editor-layout';
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

describe('EditorLayout split-view sidebar rendering', () => {
  it('keeps the split-view sidebar mounted but hidden when toggled off', () => {
    useEditorStore.setState({showSplitViewSidebar: false, image2: null});
    renderEditorLayout();

    const splitSidebar = screen.getByTestId('split-view-sidebar');
    expect(splitSidebar).toHaveClass('w-0');
    expect(splitSidebar).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows split-view controls when toggled on', () => {
    useEditorStore.setState({
      showSplitViewSidebar: true,
      image2: 'data:image/png;base64,xyz',
      splitDirection: 'vertical',
      splitRatio: 50,
    });
    renderEditorLayout();

    const splitSidebar = screen.getByTestId('split-view-sidebar');
    expect(splitSidebar).toHaveClass('w-72');
    expect(splitSidebar).toHaveAttribute('aria-hidden', 'false');
    expect(
      screen.getByRole('button', {name: 'Set split direction to vertical'}),
    ).toBeInTheDocument();
  });
});
