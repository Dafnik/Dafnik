import {fireEvent, render} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {useEditorShortcuts} from '@/features/editor/hooks/use-editor-shortcuts';
import type {BlurStroke, BlurTemplate} from '@/features/editor/state/types';
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

function makeBlurBoxStroke(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  blurType: BlurStroke['blurType'] = 'normal',
): BlurStroke {
  return {
    points: [
      {x: startX, y: startY},
      {x: endX, y: endY},
    ],
    radius: 10,
    strength: 8,
    blurType,
    shape: 'box',
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

  it('applies Ctrl+S strength adjustments to selected blur boxes in select mode', () => {
    useEditorStore.setState({
      activeTool: 'select',
      brushStrength: 10,
      selectedStrokeIndices: [1],
      blurStrokes: [
        {
          points: [{x: 10, y: 10}],
          radius: 8,
          strength: 6,
          blurType: 'normal',
        },
        {
          points: [{x: 40, y: 40}],
          radius: 8,
          strength: 12,
          blurType: 'normal',
        },
      ],
    });
    render(<ShortcutsHarness />);

    fireEvent.keyDown(window, {key: 's', ctrlKey: true});
    fireEvent.keyDown(window, {key: 'ArrowRight', ctrlKey: true});
    fireEvent.keyUp(window, {key: 's'});

    const state = useEditorStore.getState();
    expect(state.blurStrokes[0].strength).toBe(6);
    expect(state.blurStrokes[1].strength).toBe(13);
    expect(state.brushStrength).toBe(10);
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

  it('toggles blur type, cycles drag/select/blur tools, and opens export modal', () => {
    useEditorStore.setState({blurType: 'normal', activeTool: 'drag', showExportModal: false});
    render(<ShortcutsHarness />);

    fireEvent.keyDown(window, {key: 'b', ctrlKey: true});
    fireEvent.keyDown(window, {key: 't', ctrlKey: true});
    expect(useEditorStore.getState().activeTool).toBe('select');
    fireEvent.keyDown(window, {key: 't', ctrlKey: true});
    expect(useEditorStore.getState().activeTool).toBe('blur');
    fireEvent.keyDown(window, {key: 't', ctrlKey: true});
    expect(useEditorStore.getState().activeTool).toBe('drag');
    fireEvent.keyDown(window, {key: 'e', ctrlKey: true});

    const state = useEditorStore.getState();
    expect(state.blurType).toBe('pixelated');
    expect(state.activeTool).toBe('drag');
    expect(state.showExportModal).toBe(true);
  });

  it('applies Ctrl+B blur type toggle to selected blur boxes in select mode', () => {
    useEditorStore.setState({
      activeTool: 'select',
      blurType: 'normal',
      selectedStrokeIndices: [0],
      blurStrokes: [
        {
          points: [{x: 12, y: 14}],
          radius: 9,
          strength: 8,
          blurType: 'normal',
        },
        {
          points: [{x: 40, y: 45}],
          radius: 10,
          strength: 9,
          blurType: 'pixelated',
        },
      ],
    });
    render(<ShortcutsHarness />);

    fireEvent.keyDown(window, {key: 'b', ctrlKey: true});

    const state = useEditorStore.getState();
    expect(state.blurStrokes[0].blurType).toBe('pixelated');
    expect(state.blurStrokes[1].blurType).toBe('pixelated');
    expect(state.blurType).toBe('normal');
  });

  it('copies and pastes all selected blur boxes, offsetting by 15px and selecting pasted boxes', () => {
    useEditorStore.getState().initializeEditor({
      image1: 'img-1',
      image2: null,
      width: 300,
      height: 150,
    });
    useEditorStore.setState({
      activeTool: 'select',
      blurStrokes: [
        makeBlurBoxStroke(20, 20, 40, 40, 'normal'),
        makeBlurBoxStroke(80, 50, 100, 70, 'pixelated'),
      ],
      selectedStrokeIndices: [0, 1],
    });
    render(<ShortcutsHarness />);
    const historyBefore = useEditorStore.getState().history.length;

    fireEvent.keyDown(window, {key: 'c', ctrlKey: true});
    fireEvent.keyDown(window, {key: 'v', ctrlKey: true});

    const state = useEditorStore.getState();
    expect(state.blurStrokes).toHaveLength(4);
    expect(state.blurStrokes[2]).toMatchObject(makeBlurBoxStroke(35, 35, 55, 55, 'normal'));
    expect(state.blurStrokes[3]).toMatchObject(makeBlurBoxStroke(95, 65, 115, 85, 'pixelated'));
    expect(state.selectedStrokeIndices).toEqual([2, 3]);
    expect(state.history.length).toBe(historyBefore + 1);
  });

  it('accumulates paste offsets across repeated Ctrl+V after a single copy', () => {
    useEditorStore.getState().initializeEditor({
      image1: 'img-1',
      image2: null,
      width: 300,
      height: 150,
    });
    useEditorStore.setState({
      activeTool: 'select',
      blurStrokes: [makeBlurBoxStroke(20, 20, 40, 40, 'normal')],
      selectedStrokeIndices: [0],
    });
    render(<ShortcutsHarness />);

    fireEvent.keyDown(window, {key: 'c', ctrlKey: true});
    fireEvent.keyDown(window, {key: 'v', ctrlKey: true});
    fireEvent.keyDown(window, {key: 'v', ctrlKey: true});

    const state = useEditorStore.getState();
    expect(state.blurStrokes).toHaveLength(3);
    expect(state.blurStrokes[1]).toMatchObject(makeBlurBoxStroke(35, 35, 55, 55, 'normal'));
    expect(state.blurStrokes[2]).toMatchObject(makeBlurBoxStroke(50, 50, 70, 70, 'normal'));
    expect(state.selectedStrokeIndices).toEqual([2]);
  });

  it('clamps pasted blur boxes so they remain within image bounds', () => {
    useEditorStore.getState().initializeEditor({
      image1: 'img-1',
      image2: null,
      width: 100,
      height: 100,
    });
    useEditorStore.setState({
      activeTool: 'select',
      blurStrokes: [makeBlurBoxStroke(80, 80, 95, 95, 'normal')],
      selectedStrokeIndices: [0],
    });
    render(<ShortcutsHarness />);

    fireEvent.keyDown(window, {key: 'c', ctrlKey: true});
    fireEvent.keyDown(window, {key: 'v', ctrlKey: true});

    const state = useEditorStore.getState();
    expect(state.blurStrokes).toHaveLength(2);
    expect(state.blurStrokes[1]).toMatchObject(makeBlurBoxStroke(85, 85, 100, 100, 'normal'));
    expect(state.selectedStrokeIndices).toEqual([1]);
  });

  it('treats Ctrl+V with an empty clipboard as a no-op', () => {
    useEditorStore.getState().initializeEditor({
      image1: 'img-1',
      image2: null,
      width: 300,
      height: 150,
    });
    useEditorStore.setState({
      activeTool: 'select',
      blurStrokes: [makeBlurBoxStroke(20, 20, 40, 40, 'normal')],
      selectedStrokeIndices: [0],
    });
    render(<ShortcutsHarness />);
    const historyBefore = useEditorStore.getState().history.length;

    fireEvent.keyDown(window, {key: 'v', ctrlKey: true});

    const state = useEditorStore.getState();
    expect(state.blurStrokes).toHaveLength(1);
    expect(state.selectedStrokeIndices).toEqual([0]);
    expect(state.history.length).toBe(historyBefore);
  });

  it('ignores copy/paste shortcuts while typing in a text input', () => {
    useEditorStore.getState().initializeEditor({
      image1: 'img-1',
      image2: null,
      width: 300,
      height: 150,
    });
    useEditorStore.setState({
      activeTool: 'select',
      blurStrokes: [makeBlurBoxStroke(20, 20, 40, 40, 'normal')],
      selectedStrokeIndices: [0],
    });
    render(<ShortcutsHarness />);

    const textInput = document.createElement('input');
    textInput.type = 'text';
    document.body.appendChild(textInput);
    textInput.focus();

    fireEvent.keyDown(window, {key: 'c', ctrlKey: true});
    fireEvent.keyDown(window, {key: 'v', ctrlKey: true});
    textInput.blur();
    fireEvent.keyDown(window, {key: 'v', ctrlKey: true});

    const state = useEditorStore.getState();
    expect(state.blurStrokes).toHaveLength(1);
    expect(state.selectedStrokeIndices).toEqual([0]);

    textInput.remove();
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

  it('deletes selected blur strokes with Backspace and commits history once', () => {
    useEditorStore.getState().initializeEditor({
      image1: 'img-1',
      image2: null,
      width: 300,
      height: 150,
    });
    useEditorStore.setState({
      activeTool: 'select',
      blurStrokes: [
        {
          points: [{x: 10, y: 10}],
          radius: 8,
          strength: 6,
          blurType: 'normal',
        },
        {
          points: [{x: 40, y: 40}],
          radius: 9,
          strength: 7,
          blurType: 'normal',
        },
        {
          points: [{x: 80, y: 80}],
          radius: 10,
          strength: 8,
          blurType: 'pixelated',
        },
      ],
      selectedStrokeIndices: [2, 0, 2],
    });
    render(<ShortcutsHarness />);
    const historyBefore = useEditorStore.getState().history.length;

    fireEvent.keyDown(window, {key: 'Backspace', code: 'Backspace'});

    const state = useEditorStore.getState();
    expect(state.blurStrokes).toHaveLength(1);
    expect(state.blurStrokes[0].points[0]).toEqual({x: 40, y: 40});
    expect(state.selectedStrokeIndices).toEqual([]);
    expect(state.history.length).toBe(historyBefore + 1);
  });

  it('does not delete selected blur strokes with Backspace while typing in input', () => {
    useEditorStore.setState({
      activeTool: 'select',
      blurStrokes: [
        {
          points: [{x: 10, y: 10}],
          radius: 8,
          strength: 6,
          blurType: 'normal',
        },
      ],
      selectedStrokeIndices: [0],
    });
    render(<ShortcutsHarness />);

    const textInput = document.createElement('input');
    textInput.type = 'text';
    document.body.appendChild(textInput);
    textInput.focus();

    fireEvent.keyDown(window, {key: 'Backspace', code: 'Backspace'});

    const state = useEditorStore.getState();
    expect(state.blurStrokes).toHaveLength(1);
    expect(state.selectedStrokeIndices).toEqual([0]);

    textInput.remove();
  });
});
