import {fireEvent, render} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
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

describe('EditorSidebar shortcuts', () => {
  it('opens add-second-image file dialog with Ctrl+U when split upload is available', () => {
    useEditorStore.setState({image2: null});
    const {container} = renderEditorLayout();
    const fileInput = container.querySelector('aside input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click');

    fireEvent.keyDown(window, {key: 'u', code: 'KeyU', ctrlKey: true});

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});
