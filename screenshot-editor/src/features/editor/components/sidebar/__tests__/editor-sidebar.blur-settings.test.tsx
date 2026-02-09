import {fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it} from 'vitest';
import {TooltipProvider} from '@/components/ui/tooltip';
import {EditorSidebar} from '@/features/editor/components/sidebar/editor-sidebar';
import {useEditorStore} from '@/features/editor/state/use-editor-store';

function renderSidebar(selectedStrokeIndices: number[] = []) {
  return render(
    <TooltipProvider delayDuration={0} skipDelayDuration={0}>
      <EditorSidebar onAddSecondImage={() => {}} selectedStrokeIndices={selectedStrokeIndices} />
    </TooltipProvider>,
  );
}

describe('EditorSidebar blur settings behavior', () => {
  it('keeps blur section controls active in drag mode while disabling blur inputs', async () => {
    const user = userEvent.setup();
    useEditorStore.setState({
      activeTool: 'drag',
      showBlurOutlines: false,
      brushRadius: 20,
      brushStrength: 10,
      blurStrokes: [
        {
          points: [{x: 12, y: 14}],
          radius: 10,
          strength: 9,
          blurType: 'normal',
        },
      ],
    });

    renderSidebar();

    expect(screen.getByRole('button', {name: /normal/i})).toBeDisabled();
    expect(screen.getByRole('button', {name: /pixelated/i})).toBeDisabled();

    await user.click(screen.getByRole('button', {name: /toggle blur outlines/i}));
    expect(useEditorStore.getState().showBlurOutlines).toBe(true);

    await user.click(screen.getByRole('button', {name: /reset all blurs/i}));
    expect(useEditorStore.getState().blurStrokes).toHaveLength(0);

    const [strengthSlider, radiusSlider] = screen.getAllByRole('slider');
    fireEvent.keyDown(strengthSlider, {key: 'ArrowRight'});
    fireEvent.keyDown(radiusSlider, {key: 'ArrowRight'});

    const state = useEditorStore.getState();
    expect(state.brushStrength).toBe(10);
    expect(state.brushRadius).toBe(20);
  });

  it('disables blur type and strength edits in select mode with no selection', async () => {
    const user = userEvent.setup();
    useEditorStore.setState({
      activeTool: 'select',
      blurType: 'normal',
      brushStrength: 10,
      blurStrokes: [
        {
          points: [{x: 30, y: 30}],
          radius: 10,
          strength: 11,
          blurType: 'normal',
        },
      ],
    });

    renderSidebar([]);

    const pixelatedButton = screen.getByRole('button', {name: /pixelated/i});
    expect(screen.getByRole('button', {name: /normal/i})).toBeDisabled();
    expect(pixelatedButton).toBeDisabled();

    await user.click(pixelatedButton);
    expect(useEditorStore.getState().blurType).toBe('normal');
    expect(useEditorStore.getState().blurStrokes[0].blurType).toBe('normal');

    const [strengthSlider] = screen.getAllByRole('slider');
    fireEvent.keyDown(strengthSlider, {key: 'ArrowRight'});
    expect(useEditorStore.getState().brushStrength).toBe(10);
    expect(useEditorStore.getState().blurStrokes[0].strength).toBe(11);
  });

  it('forces blur outlines toggle on and disables it in select mode', () => {
    useEditorStore.setState({
      activeTool: 'select',
      showBlurOutlines: false,
    });

    renderSidebar([]);

    const outlinesToggle = screen.getByRole('button', {name: /toggle blur outlines/i});
    expect(outlinesToggle).toBeDisabled();
    expect(outlinesToggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('prefills from a single selected stroke and edits only selected stroke values', async () => {
    const user = userEvent.setup();
    useEditorStore
      .getState()
      .initializeEditor({image1: 'img-1', image2: null, width: 300, height: 150});
    useEditorStore.setState({
      activeTool: 'select',
      brushRadius: 20,
      brushStrength: 10,
      blurType: 'normal',
      blurStrokes: [
        {
          points: [{x: 20, y: 20}],
          radius: 10,
          strength: 8,
          blurType: 'normal',
        },
        {
          points: [{x: 80, y: 50}],
          radius: 12,
          strength: 22,
          blurType: 'pixelated',
        },
      ],
    });

    renderSidebar([1]);

    const pixelatedButton = screen.getByRole('button', {name: /pixelated/i});
    expect(pixelatedButton).toHaveClass('bg-primary');
    expect(screen.getByText('22')).toBeInTheDocument();

    const historyBeforeType = useEditorStore.getState().history.length;
    await user.click(screen.getByRole('button', {name: /normal/i}));
    expect(useEditorStore.getState().blurStrokes[1].blurType).toBe('normal');
    expect(useEditorStore.getState().blurStrokes[0].blurType).toBe('normal');
    expect(useEditorStore.getState().history.length).toBe(historyBeforeType + 1);

    const radiusBefore = useEditorStore.getState().brushRadius;
    const [, radiusSlider] = screen.getAllByRole('slider');
    fireEvent.keyDown(radiusSlider, {key: 'ArrowRight'});
    expect(useEditorStore.getState().brushRadius).toBe(radiusBefore);

    const historyBeforeStrength = useEditorStore.getState().history.length;
    const [strengthSlider] = screen.getAllByRole('slider');
    fireEvent.keyDown(strengthSlider, {key: 'ArrowRight'});

    const state = useEditorStore.getState();
    expect(state.blurStrokes[1].strength).toBe(23);
    expect(state.blurStrokes[0].strength).toBe(8);
    expect(state.history.length).toBe(historyBeforeStrength + 1);
  });

  it('prefills from first selected stroke in multi-select and applies edits to all selected', async () => {
    const user = userEvent.setup();
    useEditorStore
      .getState()
      .initializeEditor({image1: 'img-1', image2: null, width: 300, height: 150});
    useEditorStore.setState({
      activeTool: 'select',
      blurType: 'normal',
      brushStrength: 10,
      blurStrokes: [
        {
          points: [{x: 10, y: 20}],
          radius: 9,
          strength: 5,
          blurType: 'normal',
        },
        {
          points: [{x: 40, y: 40}],
          radius: 10,
          strength: 18,
          blurType: 'pixelated',
        },
        {
          points: [{x: 70, y: 60}],
          radius: 11,
          strength: 9,
          blurType: 'normal',
        },
      ],
    });

    const beforeSelectionOnly = JSON.stringify(useEditorStore.getState().blurStrokes);
    renderSidebar([1, 2]);
    expect(screen.getByRole('button', {name: /pixelated/i})).toHaveClass('bg-primary');
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(JSON.stringify(useEditorStore.getState().blurStrokes)).toBe(beforeSelectionOnly);

    const historyBeforeType = useEditorStore.getState().history.length;
    await user.click(screen.getByRole('button', {name: /normal/i}));
    expect(useEditorStore.getState().blurStrokes[1].blurType).toBe('normal');
    expect(useEditorStore.getState().blurStrokes[2].blurType).toBe('normal');
    expect(useEditorStore.getState().blurStrokes[0].blurType).toBe('normal');
    expect(useEditorStore.getState().history.length).toBe(historyBeforeType + 1);

    const historyBeforeStrength = useEditorStore.getState().history.length;
    const [strengthSlider] = screen.getAllByRole('slider');
    fireEvent.keyDown(strengthSlider, {key: 'ArrowLeft'});

    const state = useEditorStore.getState();
    expect(state.blurStrokes[1].strength).toBe(17);
    expect(state.blurStrokes[2].strength).toBe(17);
    expect(state.blurStrokes[0].strength).toBe(5);
    expect(state.history.length).toBe(historyBeforeStrength + 1);
  });
});
