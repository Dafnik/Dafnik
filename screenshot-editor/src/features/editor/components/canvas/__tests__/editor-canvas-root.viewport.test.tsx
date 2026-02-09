import {act, fireEvent, render} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {EditorCanvasRoot} from '@/features/editor/components/canvas/editor-canvas-root';
import {useEditorStore} from '@/features/editor/state/use-editor-store';
import {TestResizeObserver} from './editor-canvas-root.test-utils';

describe('EditorCanvasRoot viewport behavior', () => {
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
