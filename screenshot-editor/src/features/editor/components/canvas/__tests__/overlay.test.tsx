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
});
