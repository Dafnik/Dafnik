import {act, fireEvent, render} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {EditorCanvasRoot} from '@/features/editor/components/canvas/editor-canvas-root';
import {computeBlurStrokeOutlineRect} from '@/features/editor/lib/blur-box-geometry';
import {useEditorStore} from '@/features/editor/state/use-editor-store';

class TestResizeObserver {
  static instances: TestResizeObserver[] = [];
  private readonly callback: ResizeObserverCallback;
  private readonly observed = new Set<Element>();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    TestResizeObserver.instances.push(this);
  }

  observe(target: Element) {
    this.observed.add(target);
  }

  unobserve(target: Element) {
    this.observed.delete(target);
  }

  disconnect() {
    this.observed.clear();
  }

  static flush() {
    for (const instance of TestResizeObserver.instances) {
      const entries = [...instance.observed].map((target) => ({target})) as ResizeObserverEntry[];
      if (entries.length > 0) {
        instance.callback(entries, instance as unknown as ResizeObserver);
      }
    }
  }

  static reset() {
    TestResizeObserver.instances = [];
  }
}

function mockCanvasRect(canvas: HTMLCanvasElement) {
  const rect = {
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    width: 300,
    height: 150,
    right: 300,
    bottom: 150,
    toJSON: () => ({}),
  };

  Object.defineProperty(canvas, 'getBoundingClientRect', {
    configurable: true,
    value: () => rect,
  });
}

describe('EditorCanvasRoot', () => {
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
    expect(container.querySelectorAll('[data-testid="blur-outline-handle"]')).toHaveLength(0);
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

    expect(container.querySelectorAll('[data-testid=\"blur-outline-handle\"]')).toHaveLength(8);
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

  it('requires selecting a blur box before resizing it', () => {
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

    const afterMoveOnly = useEditorStore.getState().blurStrokes[0];
    const moveOnlyRect = computeBlurStrokeOutlineRect(afterMoveOnly, 300, 150);
    expect(afterMoveOnly.radius).toBe(10);
    expect(moveOnlyRect?.width).toBeCloseTo(20);
    expect(moveOnlyRect?.height).toBeCloseTo(20);

    fireEvent.pointerDown(backgroundContainer, {
      button: 0,
      pointerId: 311,
      clientX: 90,
      clientY: 90,
    });
    fireEvent.pointerMove(backgroundContainer, {
      pointerId: 311,
      clientX: 110,
      clientY: 110,
    });
    fireEvent.pointerUp(backgroundContainer, {
      pointerId: 311,
      clientX: 110,
      clientY: 110,
    });

    const resizedStroke = useEditorStore.getState().blurStrokes[0];
    const resizedRect = computeBlurStrokeOutlineRect(resizedStroke, 300, 150);
    expect(resizedStroke.radius).toBeGreaterThan(10);
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

    expect(container.querySelectorAll('[data-testid=\"blur-outline-selected\"]')).toHaveLength(2);
  });

  it('supports moving multi-selected blur boxes without showing resize handles', () => {
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

    expect(container.querySelectorAll('[data-testid=\"blur-outline-selected\"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-testid=\"blur-outline-handle\"]')).toHaveLength(0);

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

  it('zooms toward the pointer position on wheel input', () => {
    useEditorStore.setState({
      imageWidth: 300,
      imageHeight: 150,
      zoom: 100,
      panX: 0,
      panY: 0,
    });

    const {container} = render(<EditorCanvasRoot />);
    const backgroundContainer = container.firstElementChild as HTMLDivElement;
    const containerRect = {
      x: 0,
      y: 0,
      left: 100,
      top: 50,
      width: 1000,
      height: 700,
      right: 1100,
      bottom: 750,
      toJSON: () => ({}),
    };

    Object.defineProperty(backgroundContainer, 'getBoundingClientRect', {
      configurable: true,
      value: () => containerRect,
    });

    fireEvent.wheel(backgroundContainer, {
      deltaY: -100,
      clientX: 800,
      clientY: 300,
    });

    const {zoom, panX, panY} = useEditorStore.getState();
    const scaleRatio = zoom / 100;
    const pointerOffsetX = 200;
    const pointerOffsetY = -100;

    expect(zoom).toBeGreaterThan(100);
    expect(panX).toBeCloseTo((1 - scaleRatio) * pointerOffsetX, 6);
    expect(panY).toBeCloseTo((1 - scaleRatio) * pointerOffsetY, 6);
  });

  it('accumulates small wheel deltas for touchpad zoom', () => {
    useEditorStore.setState({
      imageWidth: 300,
      imageHeight: 150,
      zoom: 100,
      panX: 0,
      panY: 0,
    });

    const {container} = render(<EditorCanvasRoot />);
    const backgroundContainer = container.firstElementChild as HTMLDivElement;
    const containerRect = {
      x: 0,
      y: 0,
      left: 100,
      top: 50,
      width: 1000,
      height: 700,
      right: 1100,
      bottom: 750,
      toJSON: () => ({}),
    };

    Object.defineProperty(backgroundContainer, 'getBoundingClientRect', {
      configurable: true,
      value: () => containerRect,
    });

    for (let index = 0; index < 8; index += 1) {
      fireEvent.wheel(backgroundContainer, {
        deltaY: -0.5,
        clientX: 600,
        clientY: 400,
      });
    }

    expect(useEditorStore.getState().zoom).toBeGreaterThan(100);
  });

  it('keeps canvas screen position stable when container width changes', () => {
    const originalResizeObserver = globalThis.ResizeObserver;
    try {
      globalThis.ResizeObserver = TestResizeObserver as unknown as typeof ResizeObserver;
      TestResizeObserver.reset();

      useEditorStore.setState({
        imageWidth: 300,
        imageHeight: 150,
        panX: 0,
        panY: 0,
      });

      const {container} = render(<EditorCanvasRoot />);
      const backgroundContainer = container.firstElementChild as HTMLDivElement;
      let containerRect = {
        x: 0,
        y: 0,
        left: 100,
        top: 50,
        width: 1000,
        height: 700,
        right: 1100,
        bottom: 750,
        toJSON: () => ({}),
      };

      Object.defineProperty(backgroundContainer, 'getBoundingClientRect', {
        configurable: true,
        value: () => containerRect,
      });

      act(() => {
        TestResizeObserver.flush();
      });
      act(() => {
        useEditorStore.setState({panX: 0, panY: 0});
      });

      containerRect = {
        ...containerRect,
        width: 744,
        right: 844,
      };

      act(() => {
        TestResizeObserver.flush();
      });

      const {panX, panY} = useEditorStore.getState();
      expect(panX).toBe(128);
      expect(panY).toBe(0);
    } finally {
      globalThis.ResizeObserver = originalResizeObserver;
    }
  });
});
