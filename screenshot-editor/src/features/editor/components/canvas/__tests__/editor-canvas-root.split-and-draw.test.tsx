import {fireEvent, render} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {EditorCanvasRoot} from '@/features/editor/components/canvas/editor-canvas-root';
import {useEditorStore} from '@/features/editor/state/use-editor-store';
import {mockCanvasRect} from './editor-canvas-root.test-utils';

describe('EditorCanvasRoot split handle and drawing behavior', () => {
  it('renders a split drag handle when split view is active', () => {
    useEditorStore.setState({
      imageWidth: 300,
      imageHeight: 150,
      image2: 'img-2',
      splitDirection: 'vertical',
      splitRatio: 50,
    });

    const {getByTestId} = render(<EditorCanvasRoot />);
    expect(getByTestId('split-drag-handle')).toBeInTheDocument();
  });

  it('does not render a split drag handle without a second image', () => {
    useEditorStore.setState({
      imageWidth: 300,
      imageHeight: 150,
      image2: null,
    });

    const {queryByTestId} = render(<EditorCanvasRoot />);
    expect(queryByTestId('split-drag-handle')).not.toBeInTheDocument();
  });

  it('updates split ratio while dragging handle and does not start blur drawing', () => {
    useEditorStore.setState({
      imageWidth: 300,
      imageHeight: 150,
      image2: 'img-2',
      activeTool: 'blur',
      splitDirection: 'vertical',
      splitRatio: 50,
      blurStrokes: [],
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
      pointerId: 2,
      clientX: 150,
      clientY: 75,
    });

    fireEvent.pointerMove(backgroundContainer, {
      pointerId: 2,
      clientX: 240,
      clientY: 75,
    });

    fireEvent.pointerUp(backgroundContainer, {
      pointerId: 2,
      clientX: 240,
      clientY: 75,
    });

    const {splitRatio, isDrawing, currentStroke} = useEditorStore.getState();
    expect(splitRatio).toBe(80);
    expect(isDrawing).toBe(false);
    expect(currentStroke).toBeNull();
  });

  it('simplifies dense blur pointer moves to reduce point churn', () => {
    useEditorStore.setState({
      imageWidth: 300,
      imageHeight: 150,
      image2: null,
      activeTool: 'blur',
      brushRadius: 20,
      zoom: 100,
      blurStrokes: [],
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
      pointerId: 4,
      clientX: 40,
      clientY: 40,
    });

    const totalMoves = 40;
    for (let index = 1; index <= totalMoves; index += 1) {
      fireEvent.pointerMove(backgroundContainer, {
        pointerId: 4,
        clientX: 40 + index * 0.35,
        clientY: 40 + index * 0.15,
      });
    }

    fireEvent.pointerUp(backgroundContainer, {
      pointerId: 4,
      clientX: 58,
      clientY: 46,
    });

    const stroke = useEditorStore.getState().blurStrokes[0];
    expect(stroke).toBeDefined();
    expect(stroke.shape ?? 'brush').toBe('brush');
    expect(stroke.points.length).toBeLessThan(totalMoves + 1);
    expect(stroke.points.length).toBeGreaterThan(2);
  });

  it('creates a box-shaped blur stroke when shift is held at drag start', () => {
    useEditorStore.setState({
      imageWidth: 300,
      imageHeight: 150,
      image2: null,
      activeTool: 'blur',
      blurStrokes: [],
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
      pointerId: 410,
      clientX: 20,
      clientY: 20,
      shiftKey: true,
    });
    fireEvent.pointerMove(backgroundContainer, {
      pointerId: 410,
      clientX: 80,
      clientY: 60,
      shiftKey: true,
    });
    fireEvent.pointerUp(backgroundContainer, {
      pointerId: 410,
      clientX: 80,
      clientY: 60,
      shiftKey: true,
    });

    const stroke = useEditorStore.getState().blurStrokes[0];
    expect(stroke.shape).toBe('box');
    expect(stroke.points).toHaveLength(2);
    expect(stroke.points[1].x).toBeCloseTo(80);
    expect(stroke.points[1].y).toBeCloseTo(60);
  });
});
