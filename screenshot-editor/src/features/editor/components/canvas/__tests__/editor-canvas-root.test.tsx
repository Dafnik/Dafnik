import {render} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {EditorCanvasRoot} from '@/features/editor/components/canvas/editor-canvas-root';
import {useEditorStore} from '@/features/editor/state/use-editor-store';

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
});
