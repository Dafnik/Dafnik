import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {TooltipProvider} from '@/components/ui/tooltip';
import {EditorSidebar} from '@/features/editor/components/sidebar/editor-sidebar';
import {useEditorStore} from '@/features/editor/state/use-editor-store';

const {detectEmailsInImageMock} = vi.hoisted(() => ({
  detectEmailsInImageMock: vi.fn(),
}));

vi.mock('@/features/editor/services/email-detection', () => ({
  detectEmailsInImage: detectEmailsInImageMock,
}));

function renderSidebar(selectedStrokeIndices: number[] = []) {
  return render(
    <TooltipProvider delayDuration={0} skipDelayDuration={0}>
      <EditorSidebar onAddSecondImage={() => {}} selectedStrokeIndices={selectedStrokeIndices} />
    </TooltipProvider>,
  );
}

describe('EditorSidebar blur settings behavior', () => {
  beforeEach(() => {
    detectEmailsInImageMock.mockReset();
  });

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

  it('disables radius input while holding shift in blur tool', () => {
    useEditorStore.setState({
      activeTool: 'blur',
      isShiftPressed: true,
      brushRadius: 24,
      brushStrength: 10,
      blurType: 'normal',
    });

    renderSidebar([]);

    const [, radiusSlider] = screen.getAllByRole('slider');
    fireEvent.keyDown(radiusSlider, {key: 'ArrowRight'});
    expect(useEditorStore.getState().brushRadius).toBe(24);
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

  it('auto-blurs detected emails and appends generated box strokes', async () => {
    const user = userEvent.setup();
    useEditorStore
      .getState()
      .initializeEditor({image1: 'img-1', image2: null, width: 300, height: 150});
    useEditorStore.setState({
      activeTool: 'blur',
      blurType: 'pixelated',
      brushStrength: 13,
      brushRadius: 17,
      blurStrokes: [
        {
          points: [{x: 20, y: 20}],
          radius: 10,
          strength: 8,
          blurType: 'normal',
        },
      ],
    });
    detectEmailsInImageMock.mockResolvedValueOnce([
      {email: 'one@example.com', box: {x: 40, y: 30, width: 80, height: 20}},
      {email: 'two@example.com', box: {x: 120, y: 80, width: 90, height: 24}},
    ]);

    renderSidebar();

    const historyBefore = useEditorStore.getState().history.length;
    await user.click(screen.getByRole('button', {name: /auto blur detected emails/i}));

    await waitFor(() => {
      expect(useEditorStore.getState().blurStrokes).toHaveLength(3);
    });

    const state = useEditorStore.getState();
    expect(state.blurStrokes[0]).toMatchObject({
      strength: 8,
      blurType: 'normal',
    });
    expect(state.blurStrokes[1]).toMatchObject({
      shape: 'box',
      strength: 13,
      blurType: 'pixelated',
      radius: 17,
    });
    expect(state.blurStrokes[2]).toMatchObject({
      shape: 'box',
      strength: 13,
      blurType: 'pixelated',
      radius: 17,
    });
    expect(state.showBlurOutlines).toBe(true);
    expect(state.history.length).toBe(historyBefore + 1);
    expect(screen.getByText('Blurred 2 detected emails.')).toBeInTheDocument();
  });

  it('shows no-email status and keeps history unchanged when OCR finds no emails', async () => {
    const user = userEvent.setup();
    useEditorStore
      .getState()
      .initializeEditor({image1: 'img-1', image2: null, width: 300, height: 150});
    useEditorStore.setState({activeTool: 'blur'});
    detectEmailsInImageMock.mockResolvedValueOnce([]);

    renderSidebar();

    const historyBefore = useEditorStore.getState().history.length;
    await user.click(screen.getByRole('button', {name: /auto blur detected emails/i}));

    await screen.findByText('No email addresses detected.');
    expect(useEditorStore.getState().history.length).toBe(historyBefore);
  });

  it('disables auto-blur button while detection is pending', async () => {
    const user = userEvent.setup();
    useEditorStore
      .getState()
      .initializeEditor({image1: 'img-1', image2: null, width: 300, height: 150});
    useEditorStore.setState({activeTool: 'blur'});

    let resolveDetection: ((value: unknown) => void) | null = null;
    detectEmailsInImageMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveDetection = resolve;
      }),
    );

    renderSidebar();

    const button = screen.getByRole('button', {name: /auto blur detected emails/i});
    await user.click(button);
    expect(button).toBeDisabled();

    resolveDetection?.([]);
    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });
});
