import {fireEvent, render} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {useEditorShortcuts} from '@/features/editor/hooks/use-editor-shortcuts';
import type {BlurTemplate} from '@/features/editor/state/types';
import {useEditorStore} from '@/features/editor/state/use-editor-store';

function ShortcutsHarness() {
  useEditorShortcuts();
  return null;
}

function makeTemplate(
  id: string,
  name: string,
  point: {xRatio: number; yRatio: number},
): BlurTemplate {
  return {
    id,
    name,
    sourceWidth: 100,
    sourceHeight: 100,
    strokes: [
      {
        points: [point],
        radiusRatio: 0.1,
        strength: 8,
        blurType: 'normal',
      },
    ],
    createdAt: '2026-02-07T00:00:00.000Z',
    updatedAt: '2026-02-07T00:00:00.000Z',
  };
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

  it('loads ordered template slot and opens template panel with Ctrl+2', () => {
    useEditorStore.setState({
      imageWidth: 100,
      imageHeight: 100,
      showTemplatePanel: false,
      blurStrokes: [],
      blurTemplates: [
        makeTemplate('template-1', 'Faces', {xRatio: 0.1, yRatio: 0.1}),
        makeTemplate('template-2', 'Names', {xRatio: 0.8, yRatio: 0.6}),
      ],
    });
    render(<ShortcutsHarness />);

    fireEvent.keyDown(window, {key: '2', code: 'Digit2', ctrlKey: true});

    const state = useEditorStore.getState();
    expect(state.showTemplatePanel).toBe(true);
    expect(state.selectedTemplateId).toBe('template-2');
    expect(state.blurStrokes[0].points[0].x).toBeCloseTo(80);
    expect(state.blurStrokes[0].points[0].y).toBeCloseTo(60);
  });

  it('uses current template order for Ctrl+1 slot selection', () => {
    useEditorStore.setState({
      imageWidth: 100,
      imageHeight: 100,
      blurStrokes: [],
      blurTemplates: [
        makeTemplate('template-1', 'Faces', {xRatio: 0.1, yRatio: 0.1}),
        makeTemplate('template-2', 'Names', {xRatio: 0.8, yRatio: 0.6}),
      ],
    });
    useEditorStore.getState().reorderBlurTemplates(0, 1);
    render(<ShortcutsHarness />);

    fireEvent.keyDown(window, {key: '1', code: 'Digit1', ctrlKey: true});

    expect(useEditorStore.getState().selectedTemplateId).toBe('template-2');
  });

  it('treats missing Ctrl+9 template slot as no-op while preventing default', () => {
    useEditorStore.setState({
      showTemplatePanel: false,
      selectedTemplateId: null,
      blurStrokes: [],
      blurTemplates: [makeTemplate('template-1', 'Faces', {xRatio: 0.1, yRatio: 0.1})],
    });
    render(<ShortcutsHarness />);

    const event = new KeyboardEvent('keydown', {
      key: '9',
      code: 'Digit9',
      ctrlKey: true,
      cancelable: true,
    });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(useEditorStore.getState().showTemplatePanel).toBe(false);
    expect(useEditorStore.getState().selectedTemplateId).toBeNull();
    expect(useEditorStore.getState().blurStrokes).toHaveLength(0);
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
