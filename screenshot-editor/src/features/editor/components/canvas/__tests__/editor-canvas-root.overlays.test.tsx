import {fireEvent, render, waitFor} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {EditorCanvasRoot} from '@/features/editor/components/canvas/editor-canvas-root';
import {useEditorStore} from '@/features/editor/state/use-editor-store';
import {mockCanvasRect} from './editor-canvas-root.test-utils';

describe('EditorCanvasRoot overlays and cursor behavior', () => {
  it('shows outline overlay for existing strokes when enabled', () => {
    useEditorStore.setState({
      showBlurOutlines: true,
      imageWidth: 200,
      imageHeight: 120,
      blurStrokes: [
        {
          points: [
            {x: 20, y: 30},
            {x: 40, y: 50},
          ],
          radius: 10,
          strength: 12,
          blurType: 'normal',
        },
      ],
      currentStroke: null,
    });

    const {container} = render(<EditorCanvasRoot />);
    expect(container.querySelectorAll('[data-testid="blur-outline"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-testid="blur-outline-selected"]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-testid="blur-outline-handle"]')).toHaveLength(0);
  });

  it('allows panning by dragging on background while drag tool is active', () => {
    useEditorStore.setState({activeTool: 'drag'});

    const {container} = render(<EditorCanvasRoot />);
    const backgroundContainer = container.firstElementChild as HTMLElement;
    expect(backgroundContainer).toBeInTheDocument();

    fireEvent.pointerDown(backgroundContainer, {
      button: 0,
      pointerId: 1,
      clientX: 200,
      clientY: 150,
    });
    fireEvent.pointerMove(backgroundContainer, {pointerId: 1, clientX: 240, clientY: 190});
    fireEvent.pointerUp(backgroundContainer, {pointerId: 1, clientX: 240, clientY: 190});

    const {panX, panY} = useEditorStore.getState();
    expect(panX).toBe(40);
    expect(panY).toBe(40);
  });

  it('changes cursor and hides radius preview while shift is held in blur tool', () => {
    useEditorStore.setState({
      activeTool: 'blur',
      isShiftPressed: true,
      imageWidth: 300,
      imageHeight: 150,
      brushRadius: 20,
      showBlurOutlines: false,
      blurStrokes: [],
      currentStroke: null,
    });

    const {container} = render(<EditorCanvasRoot />);
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    mockCanvasRect(canvas);
    const backgroundContainer = container.firstElementChild as HTMLElement;
    expect(backgroundContainer.style.cursor).toBe('cell');

    fireEvent.pointerMove(backgroundContainer, {
      pointerId: 900,
      clientX: 40,
      clientY: 40,
      shiftKey: true,
    });

    expect(container.querySelector('[data-testid="brush-radius-preview"]')).toBeNull();
  });

  it('shows radius preview in blur tool when shift is not held', async () => {
    useEditorStore.setState({
      activeTool: 'blur',
      isShiftPressed: false,
      imageWidth: 300,
      imageHeight: 150,
      brushRadius: 20,
      showBlurOutlines: false,
      blurStrokes: [],
      currentStroke: null,
    });

    const {container} = render(<EditorCanvasRoot />);
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    mockCanvasRect(canvas);
    const backgroundContainer = container.firstElementChild as HTMLElement;
    expect(backgroundContainer.style.cursor).toBe('crosshair');

    fireEvent.pointerMove(backgroundContainer, {
      pointerId: 901,
      clientX: 50,
      clientY: 50,
      shiftKey: false,
    });

    await waitFor(() =>
      expect(container.querySelector('[data-testid="brush-radius-preview"]')).toBeInTheDocument(),
    );
  });

  it('auto-shows blur outlines while select tool is active', () => {
    useEditorStore.setState({
      showBlurOutlines: false,
      activeTool: 'select',
      imageWidth: 200,
      imageHeight: 120,
      blurStrokes: [
        {
          points: [{x: 20, y: 30}],
          radius: 10,
          strength: 12,
          blurType: 'normal',
        },
      ],
      currentStroke: null,
    });

    const {container} = render(<EditorCanvasRoot />);
    expect(container.querySelectorAll('[data-testid="blur-outline"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-testid="blur-outline-selected"]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-testid="blur-outline-handle"]')).toHaveLength(8);
  });

  it('does not show outlines in blur mode when outlines are disabled and no box is being drawn', () => {
    useEditorStore.setState({
      showBlurOutlines: false,
      activeTool: 'blur',
      imageWidth: 200,
      imageHeight: 120,
      blurStrokes: [
        {
          points: [{x: 20, y: 30}],
          radius: 10,
          strength: 12,
          blurType: 'normal',
        },
      ],
      currentStroke: null,
    });

    const {container} = render(<EditorCanvasRoot />);
    expect(container.querySelectorAll('[data-testid="blur-outline"]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-testid="blur-outline-selected"]')).toHaveLength(0);
  });

  it('shows only the in-progress shift-box outline when global outlines are disabled', () => {
    useEditorStore.setState({
      showBlurOutlines: false,
      imageWidth: 300,
      imageHeight: 150,
      image2: null,
      activeTool: 'blur',
      blurStrokes: [
        {
          points: [{x: 12, y: 16}],
          radius: 8,
          strength: 10,
          blurType: 'normal',
        },
      ],
      currentStroke: null,
      isDrawing: false,
    });

    const {container} = render(<EditorCanvasRoot />);
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    expect(canvas).toBeInTheDocument();
    mockCanvasRect(canvas);
    const backgroundContainer = container.firstElementChild as HTMLElement;

    fireEvent.pointerDown(backgroundContainer, {
      button: 0,
      pointerId: 411,
      clientX: 20,
      clientY: 20,
      shiftKey: true,
    });
    fireEvent.pointerMove(backgroundContainer, {
      pointerId: 411,
      clientX: 80,
      clientY: 60,
      shiftKey: true,
    });

    expect(container.querySelectorAll('[data-testid="blur-outline"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-testid="blur-outline-selected"]')).toHaveLength(0);
  });
});
