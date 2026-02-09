import {render} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {BlurOutlineOverlay} from '@/features/editor/components/canvas/blur-outline-overlay';

describe('BlurOutlineOverlay', () => {
  it('renders red rectangles for blur strokes when visible', () => {
    const {container} = render(
      <BlurOutlineOverlay
        visible
        canvasWidth={100}
        canvasHeight={100}
        strokes={[
          {
            points: [
              {x: 10, y: 10},
              {x: 20, y: 20},
            ],
            radius: 5,
            strength: 10,
            blurType: 'normal',
          },
        ]}
      />,
    );

    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelectorAll('rect')).toHaveLength(1);
  });

  it('renders nothing when not visible', () => {
    const {container} = render(
      <BlurOutlineOverlay
        visible={false}
        canvasWidth={100}
        canvasHeight={100}
        strokes={[
          {
            points: [{x: 10, y: 10}],
            radius: 5,
            strength: 10,
            blurType: 'normal',
          },
        ]}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders selected outlines and resize handles for a single selected blur box', () => {
    const {container, getAllByTestId} = render(
      <BlurOutlineOverlay
        visible
        canvasWidth={100}
        canvasHeight={100}
        selectedStrokeIndices={[0]}
        showResizeHandles
        strokes={[
          {
            points: [
              {x: 10, y: 10},
              {x: 20, y: 20},
            ],
            radius: 5,
            strength: 10,
            blurType: 'normal',
          },
        ]}
      />,
    );

    expect(container.querySelectorAll('[data-testid=\"blur-outline-selected\"]')).toHaveLength(1);
    expect(getAllByTestId('blur-outline-handle')).toHaveLength(8);
  });

  it('renders resize handles for all blur boxes when requested', () => {
    const {container} = render(
      <BlurOutlineOverlay
        visible
        showResizeHandlesForAll
        canvasWidth={100}
        canvasHeight={100}
        strokes={[
          {
            points: [{x: 10, y: 10}],
            radius: 5,
            strength: 10,
            blurType: 'normal',
          },
          {
            points: [{x: 40, y: 40}],
            radius: 6,
            strength: 12,
            blurType: 'pixelated',
          },
        ]}
      />,
    );

    expect(container.querySelectorAll('[data-testid="blur-outline-handle"]')).toHaveLength(16);
  });

  it('keeps handles hidden when using dashed outlines without selection mode handles', () => {
    const {container} = render(
      <BlurOutlineOverlay
        visible
        forceDashedStyle
        canvasWidth={100}
        canvasHeight={100}
        strokes={[
          {
            points: [{x: 10, y: 10}],
            radius: 5,
            strength: 10,
            blurType: 'normal',
          },
        ]}
      />,
    );

    expect(container.querySelectorAll('[data-testid="blur-outline"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-testid="blur-outline-selected"]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-testid="blur-outline-handle"]')).toHaveLength(0);
  });

  it('renders box-shaped blur outlines from two-corner strokes', () => {
    const {container} = render(
      <BlurOutlineOverlay
        visible
        canvasWidth={100}
        canvasHeight={100}
        strokes={[
          {
            points: [
              {x: 40, y: 20},
              {x: 10, y: 60},
            ],
            radius: 5,
            strength: 10,
            blurType: 'normal',
            shape: 'box',
          },
        ]}
      />,
    );

    const rect = container.querySelector('rect');
    expect(rect).toHaveAttribute('x', '10');
    expect(rect).toHaveAttribute('y', '20');
    expect(rect).toHaveAttribute('width', '30');
    expect(rect).toHaveAttribute('height', '40');
  });

  it('renders marquee rectangle when marquee is active', () => {
    const {getByTestId} = render(
      <BlurOutlineOverlay
        visible
        canvasWidth={100}
        canvasHeight={100}
        marqueeRect={{x: 10, y: 15, width: 20, height: 25}}
        strokes={[]}
      />,
    );

    expect(getByTestId('blur-outline-marquee')).toBeInTheDocument();
  });
});
