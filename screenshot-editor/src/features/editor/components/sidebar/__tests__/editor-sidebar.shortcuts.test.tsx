import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it, vi} from 'vitest';
import {EditorLayout} from '@/features/editor/components/layout/editor-layout';
import {useEditorShortcuts} from '@/features/editor/hooks/use-editor-shortcuts';
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

function ShortcutEnabledEditorLayout() {
  useEditorShortcuts();
  return (
    <EditorLayout
      onAddSecondImage={() => {}}
      onSelectFirstLightImage={() => {}}
      onSelectSecondLightImage={() => {}}
      onCancelLightSelection={() => {}}
    />
  );
}

describe('EditorSidebar shortcuts', () => {
  it('opens add-second-image file dialog with Ctrl+U when split upload is available', () => {
    useEditorStore.setState({image2: null});
    renderEditorLayout();
    const fileInput = screen.getByTestId('split-view-upload-input') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click');

    fireEvent.keyDown(window, {key: 'u', code: 'KeyU', ctrlKey: true});

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('clears existing blur strokes with reset button', async () => {
    const user = userEvent.setup();
    useEditorStore.setState({
      activeTool: 'blur',
      blurStrokes: [
        {
          points: [{x: 10, y: 12}],
          radius: 8,
          strength: 10,
          blurType: 'normal',
        },
      ],
    });
    renderEditorLayout();

    await user.click(screen.getByRole('button', {name: /reset all blurs/i}));

    expect(useEditorStore.getState().blurStrokes).toHaveLength(0);
  });

  it('opens auto blur dropdown and focuses custom text input with Ctrl+A', async () => {
    useEditorStore
      .getState()
      .initializeEditor({image1: 'img-1', image2: null, width: 300, height: 150});
    useEditorStore.setState({activeTool: 'blur'});

    render(<ShortcutEnabledEditorLayout />);

    fireEvent.keyDown(window, {key: 'a', code: 'KeyA', ctrlKey: true});

    const customInput = screen.getByPlaceholderText(/enter text/i);
    expect(screen.getByRole('button', {name: /auto blur phone numbers/i})).toBeInTheDocument();
    await waitFor(() => {
      expect(customInput).toHaveFocus();
    });
  });
});
