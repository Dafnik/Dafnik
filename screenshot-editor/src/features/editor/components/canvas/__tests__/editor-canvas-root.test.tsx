import {fireEvent, render} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {EditorCanvasRoot} from '@/features/editor/components/canvas/editor-canvas-root';
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
    expect(container.querySelectorAll('rect')).toHaveLength(1);
  });

  it('allows panning by dragging on background while select tool is active', () => {
    useEditorStore.setState({activeTool: 'select'});

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

      TestResizeObserver.flush();

      containerRect = {
        ...containerRect,
        width: 744,
        right: 844,
      };

      TestResizeObserver.flush();

      const {panX, panY} = useEditorStore.getState();
      expect(panX).toBe(128);
      expect(panY).toBe(0);
    } finally {
      globalThis.ResizeObserver = originalResizeObserver;
    }
  });
});
