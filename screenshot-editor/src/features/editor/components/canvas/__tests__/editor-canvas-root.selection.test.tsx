import {fireEvent, render} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {EditorCanvasRoot} from '@/features/editor/components/canvas/editor-canvas-root';
import {computeBlurStrokeOutlineRect} from '@/features/editor/lib/blur-box-geometry';
import {useEditorStore} from '@/features/editor/state/use-editor-store';
import {mockCanvasRect} from './editor-canvas-root.test-utils';

describe('EditorCanvasRoot selection behavior', () => {
  it('moves a single selected blur box and commits one history snapshot on pointer up', () => {
    useEditorStore
      .getState()
      .initializeEditor({image1: 'img-1', image2: null, width: 300, height: 150});
    useEditorStore.setState({
      activeTool: 'select',
      blurStrokes: [
        {
          points: [{x: 40, y: 40}],
          radius: 10,
          strength: 10,
          blurType: 'normal',
        },
      ],
    });

    const {container} = render(<EditorCanvasRoot />);
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    mockCanvasRect(canvas);
    const backgroundContainer = container.firstElementChild as HTMLElement;
    const historyBefore = useEditorStore.getState().history.length;

    fireEvent.pointerDown(backgroundContainer, {
      button: 0,
      pointerId: 20,
      clientX: 40,
      clientY: 40,
    });
    fireEvent.pointerMove(backgroundContainer, {
      pointerId: 20,
      clientX: 70,
      clientY: 75,
    });
    fireEvent.pointerUp(backgroundContainer, {
      pointerId: 20,
      clientX: 70,
      clientY: 75,
    });

    const state = useEditorStore.getState();
    expect(state.blurStrokes[0].points[0].x).toBeCloseTo(70);
    expect(state.blurStrokes[0].points[0].y).toBeCloseTo(75);
    expect(state.history.length).toBe(historyBefore + 1);
  });

  it('resizes a single selected blur box and commits one history snapshot on pointer up', () => {
    useEditorStore
      .getState()
      .initializeEditor({image1: 'img-1', image2: null, width: 300, height: 150});
    useEditorStore.setState({
      activeTool: 'select',
      blurStrokes: [
        {
          points: [{x: 60, y: 60}],
          radius: 10,
          strength: 10,
          blurType: 'normal',
        },
      ],
    });

    const {container} = render(<EditorCanvasRoot />);
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    mockCanvasRect(canvas);
    const backgroundContainer = container.firstElementChild as HTMLElement;

    fireEvent.pointerDown(backgroundContainer, {
      button: 0,
      pointerId: 30,
      clientX: 60,
      clientY: 60,
    });
    fireEvent.pointerUp(backgroundContainer, {
      pointerId: 30,
      clientX: 60,
      clientY: 60,
    });

    expect(container.querySelectorAll('[data-testid="blur-outline-handle"]')).toHaveLength(8);
    const historyBefore = useEditorStore.getState().history.length;

    fireEvent.pointerDown(backgroundContainer, {
      button: 0,
      pointerId: 31,
      clientX: 70,
      clientY: 70,
    });
    fireEvent.pointerMove(backgroundContainer, {
      pointerId: 31,
      clientX: 90,
      clientY: 90,
    });
    fireEvent.pointerUp(backgroundContainer, {
      pointerId: 31,
      clientX: 90,
      clientY: 90,
    });

    const state = useEditorStore.getState();
    expect(state.blurStrokes[0].points[0].x).toBeGreaterThan(60);
    expect(state.blurStrokes[0].points[0].y).toBeGreaterThan(60);
    expect(state.blurStrokes[0].radius).toBeGreaterThan(10);
    expect(state.history.length).toBe(historyBefore + 1);
  });

  it('allows resizing a blur box handle without pre-selecting the box first', () => {
    useEditorStore
      .getState()
      .initializeEditor({image1: 'img-1', image2: null, width: 300, height: 150});
    useEditorStore.setState({
      activeTool: 'select',
      blurStrokes: [
        {
          points: [{x: 60, y: 60}],
          radius: 10,
          strength: 10,
          blurType: 'normal',
        },
      ],
    });

    const {container} = render(<EditorCanvasRoot />);
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    mockCanvasRect(canvas);
    const backgroundContainer = container.firstElementChild as HTMLElement;

    fireEvent.pointerDown(backgroundContainer, {
      button: 0,
      pointerId: 310,
      clientX: 70,
      clientY: 70,
    });
    fireEvent.pointerMove(backgroundContainer, {
      pointerId: 310,
      clientX: 90,
      clientY: 90,
    });
    fireEvent.pointerUp(backgroundContainer, {
      pointerId: 310,
      clientX: 90,
      clientY: 90,
    });

    const resized = useEditorStore.getState().blurStrokes[0];
    const resizedRect = computeBlurStrokeOutlineRect(resized, 300, 150);
    expect(resized.radius).toBeGreaterThan(10);
    expect(resizedRect?.width).toBeGreaterThan(20);
    expect(resizedRect?.height).toBeGreaterThan(20);
  });

  it('keeps aspect ratio when shift-resizing from corner handles', () => {
    useEditorStore
      .getState()
      .initializeEditor({image1: 'img-1', image2: null, width: 300, height: 150});
    useEditorStore.setState({
      activeTool: 'select',
      blurStrokes: [
        {
          points: [
            {x: 80, y: 60},
            {x: 120, y: 60},
          ],
          radius: 10,
          strength: 10,
          blurType: 'normal',
        },
      ],
    });

    const {container} = render(<EditorCanvasRoot />);
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    mockCanvasRect(canvas);
    const backgroundContainer = container.firstElementChild as HTMLElement;
    const initialRect = computeBlurStrokeOutlineRect(
      useEditorStore.getState().blurStrokes[0],
      300,
      150,
    );
    expect(initialRect).toBeTruthy();
    const initialRatio = (initialRect?.width ?? 1) / Math.max(initialRect?.height ?? 1, 1e-4);

    fireEvent.pointerDown(backgroundContainer, {
      button: 0,
      pointerId: 320,
      clientX: 100,
      clientY: 60,
    });
    fireEvent.pointerUp(backgroundContainer, {
      pointerId: 320,
      clientX: 100,
      clientY: 60,
    });

    fireEvent.pointerDown(backgroundContainer, {
      button: 0,
      pointerId: 321,
      clientX: 130,
      clientY: 70,
      shiftKey: true,
    });
    fireEvent.pointerMove(backgroundContainer, {
      pointerId: 321,
      clientX: 160,
      clientY: 110,
      shiftKey: true,
    });
    fireEvent.pointerUp(backgroundContainer, {
      pointerId: 321,
      clientX: 160,
      clientY: 110,
      shiftKey: true,
    });

    const nextRect = computeBlurStrokeOutlineRect(
      useEditorStore.getState().blurStrokes[0],
      300,
      150,
    );
    expect(nextRect).toBeTruthy();
    const nextRatio = (nextRect?.width ?? 1) / Math.max(nextRect?.height ?? 1, 1e-4);
    expect(nextRatio).toBeCloseTo(initialRatio, 1);
  });

  it('uses center-scaled aspect lock for shift-resizing from side handles', () => {
    useEditorStore
      .getState()
      .initializeEditor({image1: 'img-1', image2: null, width: 300, height: 150});
    useEditorStore.setState({
      activeTool: 'select',
      blurStrokes: [
        {
          points: [
            {x: 80, y: 60},
            {x: 120, y: 60},
          ],
          radius: 10,
          strength: 10,
          blurType: 'normal',
        },
      ],
    });

    const {container} = render(<EditorCanvasRoot />);
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    mockCanvasRect(canvas);
    const backgroundContainer = container.firstElementChild as HTMLElement;

    fireEvent.pointerDown(backgroundContainer, {
      button: 0,
      pointerId: 330,
      clientX: 100,
      clientY: 60,
    });
    fireEvent.pointerUp(backgroundContainer, {
      pointerId: 330,
      clientX: 100,
      clientY: 60,
    });

    const before = computeBlurStrokeOutlineRect(useEditorStore.getState().blurStrokes[0], 300, 150);
    expect(before).toBeTruthy();
    const beforeCenterY = (before?.y ?? 0) + (before?.height ?? 0) / 2;
    const beforeRatio = (before?.width ?? 1) / Math.max(before?.height ?? 1, 1e-4);

    fireEvent.pointerDown(backgroundContainer, {
      button: 0,
      pointerId: 331,
      clientX: 130,
      clientY: 60,
      shiftKey: true,
    });
    fireEvent.pointerMove(backgroundContainer, {
      pointerId: 331,
      clientX: 160,
      clientY: 60,
      shiftKey: true,
    });
    fireEvent.pointerUp(backgroundContainer, {
      pointerId: 331,
      clientX: 160,
      clientY: 60,
      shiftKey: true,
    });

    const after = computeBlurStrokeOutlineRect(useEditorStore.getState().blurStrokes[0], 300, 150);
    expect(after).toBeTruthy();
    const afterCenterY = (after?.y ?? 0) + (after?.height ?? 0) / 2;
    const afterRatio = (after?.width ?? 1) / Math.max(after?.height ?? 1, 1e-4);
    expect(afterRatio).toBeCloseTo(beforeRatio, 1);
    expect(afterCenterY).toBeCloseTo(beforeCenterY, 1);
  });

  it('marquee-selects all blur boxes that overlap the selection rectangle', () => {
    useEditorStore.setState({
      activeTool: 'select',
      imageWidth: 300,
      imageHeight: 150,
      blurStrokes: [
        {
          points: [{x: 30, y: 30}],
          radius: 10,
          strength: 10,
          blurType: 'normal',
        },
        {
          points: [{x: 90, y: 80}],
          radius: 10,
          strength: 10,
          blurType: 'normal',
        },
      ],
    });

    const {container} = render(<EditorCanvasRoot />);
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    mockCanvasRect(canvas);
    const backgroundContainer = container.firstElementChild as HTMLElement;

    fireEvent.pointerDown(backgroundContainer, {
      button: 0,
      pointerId: 40,
      clientX: 5,
      clientY: 5,
    });
    fireEvent.pointerMove(backgroundContainer, {
      pointerId: 40,
      clientX: 110,
      clientY: 95,
    });
    fireEvent.pointerUp(backgroundContainer, {
      pointerId: 40,
      clientX: 110,
      clientY: 95,
    });

    expect(container.querySelectorAll('[data-testid="blur-outline-selected"]')).toHaveLength(2);
  });

  it('supports moving multi-selected blur boxes while showing resize handles', () => {
    useEditorStore.setState({
      activeTool: 'select',
      imageWidth: 300,
      imageHeight: 150,
      blurStrokes: [
        {
          points: [{x: 30, y: 30}],
          radius: 10,
          strength: 10,
          blurType: 'normal',
        },
        {
          points: [{x: 90, y: 80}],
          radius: 10,
          strength: 10,
          blurType: 'normal',
        },
      ],
    });

    const {container} = render(<EditorCanvasRoot />);
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    mockCanvasRect(canvas);
    const backgroundContainer = container.firstElementChild as HTMLElement;

    fireEvent.pointerDown(backgroundContainer, {
      button: 0,
      pointerId: 50,
      clientX: 5,
      clientY: 5,
    });
    fireEvent.pointerMove(backgroundContainer, {
      pointerId: 50,
      clientX: 110,
      clientY: 95,
    });
    fireEvent.pointerUp(backgroundContainer, {
      pointerId: 50,
      clientX: 110,
      clientY: 95,
    });

    expect(container.querySelectorAll('[data-testid="blur-outline-selected"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-testid="blur-outline-handle"]')).toHaveLength(16);

    fireEvent.pointerDown(backgroundContainer, {
      button: 0,
      pointerId: 51,
      clientX: 30,
      clientY: 30,
    });
    fireEvent.pointerMove(backgroundContainer, {
      pointerId: 51,
      clientX: 45,
      clientY: 35,
    });
    fireEvent.pointerUp(backgroundContainer, {
      pointerId: 51,
      clientX: 45,
      clientY: 35,
    });

    const state = useEditorStore.getState();
    expect(state.blurStrokes[0].points[0].x).toBeCloseTo(45);
    expect(state.blurStrokes[0].points[0].y).toBeCloseTo(35);
    expect(state.blurStrokes[1].points[0].x).toBeCloseTo(105);
    expect(state.blurStrokes[1].points[0].y).toBeCloseTo(85);
    expect(state.blurStrokes[0].radius).toBe(10);
    expect(state.blurStrokes[1].radius).toBe(10);
  });
});
