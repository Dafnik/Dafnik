import {fireEvent, render} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {useEditorShortcuts} from '@/features/editor/hooks/use-editor-shortcuts';
import {useEditorStore} from '@/features/editor/state/use-editor-store';

function ShortcutsHarness() {
  useEditorShortcuts();
  return null;
}

describe('useEditorShortcuts', () => {
  it('toggles blur outlines with Ctrl+O', () => {
    render(<ShortcutsHarness />);

    expect(useEditorStore.getState().showBlurOutlines).toBe(false);
    fireEvent.keyDown(window, {key: 'o', ctrlKey: true});
    expect(useEditorStore.getState().showBlurOutlines).toBe(true);
  });

  it('cycles split direction with Ctrl+D', () => {
    render(<ShortcutsHarness />);

    expect(useEditorStore.getState().splitDirection).toBe('vertical');
    fireEvent.keyDown(window, {key: 'd', ctrlKey: true});
    expect(useEditorStore.getState().splitDirection).toBe('horizontal');
    fireEvent.keyDown(window, {key: 'd', ctrlKey: true});
    expect(useEditorStore.getState().splitDirection).toBe('diagonal-tl-br');
  });

  it('toggles split placement with Ctrl+P', () => {
    useEditorStore.setState({lightImageSide: 'left'});
    render(<ShortcutsHarness />);

    fireEvent.keyDown(window, {key: 'p', ctrlKey: true});
    expect(useEditorStore.getState().lightImageSide).toBe('right');

    fireEvent.keyDown(window, {key: 'p', ctrlKey: true});
    expect(useEditorStore.getState().lightImageSide).toBe('left');
  });

  it('adjusts blur radius with Ctrl+R + Arrow keys', () => {
    useEditorStore.setState({brushRadius: 20});
    render(<ShortcutsHarness />);

    fireEvent.keyDown(window, {key: 'r', ctrlKey: true});
    fireEvent.keyDown(window, {key: 'ArrowRight', ctrlKey: true});
    fireEvent.keyUp(window, {key: 'r'});

    expect(useEditorStore.getState().brushRadius).toBe(21);
  });

  it('adjusts blur strength with Ctrl+S + Arrow keys', () => {
    useEditorStore.setState({brushStrength: 10});
    render(<ShortcutsHarness />);

    fireEvent.keyDown(window, {key: 's', ctrlKey: true});
    fireEvent.keyDown(window, {key: 'ArrowLeft', ctrlKey: true});
    fireEvent.keyUp(window, {key: 's'});

    expect(useEditorStore.getState().brushStrength).toBe(9);
  });

  it('also adjusts blur radius and strength with Ctrl+R/S + J/K', () => {
    useEditorStore.setState({brushRadius: 20, brushStrength: 10});
    render(<ShortcutsHarness />);

    fireEvent.keyDown(window, {key: 'r', ctrlKey: true});
    fireEvent.keyDown(window, {key: 'k', ctrlKey: true});
    fireEvent.keyUp(window, {key: 'r'});

    fireEvent.keyDown(window, {key: 's', ctrlKey: true});
    fireEvent.keyDown(window, {key: 'j', ctrlKey: true});
    fireEvent.keyUp(window, {key: 's'});

    const state = useEditorStore.getState();
    expect(state.brushRadius).toBe(21);
    expect(state.brushStrength).toBe(9);
  });

  it('toggles shortcuts modal with Ctrl+/', () => {
    render(<ShortcutsHarness />);

    expect(useEditorStore.getState().showShortcutsModal).toBe(false);

    fireEvent.keyDown(window, {key: '/', code: 'Slash', ctrlKey: true});
    expect(useEditorStore.getState().showShortcutsModal).toBe(true);

    fireEvent.keyDown(window, {key: '/', code: 'Slash', ctrlKey: true});
    expect(useEditorStore.getState().showShortcutsModal).toBe(false);
  });

  it('opens shortcuts modal with Ctrl+/ while text input is focused', () => {
    render(<ShortcutsHarness />);

    const textInput = document.createElement('input');
    textInput.type = 'text';
    document.body.appendChild(textInput);
    textInput.focus();

    fireEvent.keyDown(window, {key: '/', code: 'Slash', ctrlKey: true});
    expect(useEditorStore.getState().showShortcutsModal).toBe(true);

    textInput.remove();
  });

  it('zooms with Ctrl+ArrowLeft/ArrowRight', () => {
    useEditorStore.setState({zoom: 230});
    render(<ShortcutsHarness />);

    fireEvent.keyDown(window, {key: 'ArrowLeft', ctrlKey: true});
    expect(useEditorStore.getState().zoom).toBe(220);

    fireEvent.keyDown(window, {key: 'ArrowRight', ctrlKey: true});
    expect(useEditorStore.getState().zoom).toBe(230);
  });

  it('toggles blur type, switches tool, and opens export modal', () => {
    useEditorStore.setState({blurType: 'normal', activeTool: 'select', showExportModal: false});
    render(<ShortcutsHarness />);

    fireEvent.keyDown(window, {key: 'b', ctrlKey: true});
    fireEvent.keyDown(window, {key: 't', ctrlKey: true});
    fireEvent.keyDown(window, {key: 'e', ctrlKey: true});

    const state = useEditorStore.getState();
    expect(state.blurType).toBe('pixelated');
    expect(state.activeTool).toBe('blur');
    expect(state.showExportModal).toBe(true);
  });

  it('confirms before starting a new project with Ctrl+N', () => {
    const confirmMock = vi
      .spyOn(window, 'confirm')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    useEditorStore.setState({image1: 'img-1', isEditing: true});
    render(<ShortcutsHarness />);

    fireEvent.keyDown(window, {key: 'n', ctrlKey: true});
    expect(useEditorStore.getState().image1).toBe('img-1');

    fireEvent.keyDown(window, {key: 'n', ctrlKey: true});
    expect(useEditorStore.getState().image1).toBeNull();
    expect(confirmMock).toHaveBeenCalledTimes(2);
    confirmMock.mockRestore();
  });
});
