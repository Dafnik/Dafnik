import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it} from 'vitest';
import {EditorLayout} from '@/features/editor/components/layout/editor-layout';
import {BlurTemplatePanel} from '@/features/editor/components/sidebar/blur-template-panel';
import type {BlurTemplate} from '@/features/editor/state/types';
import {useEditorStore} from '@/features/editor/state/use-editor-store';

const baseTemplate: BlurTemplate = {
  id: 'template-1',
  name: 'Faces',
  sourceWidth: 100,
  sourceHeight: 100,
  strokes: [
    {
      points: [{xRatio: 0.2, yRatio: 0.2}],
      radiusRatio: 0.1,
      strength: 9,
      blurType: 'normal',
    },
  ],
  createdAt: '2026-02-07T00:00:00.000Z',
  updatedAt: '2026-02-07T00:00:00.000Z',
};

describe('template panel integration', () => {
  it('toggles right panel via Template button in toolbar', async () => {
    const user = userEvent.setup();

    useEditorStore.setState({activeTool: 'blur', showTemplatePanel: false});

    render(
      <EditorLayout
        onAddSecondImage={() => {}}
        onSelectFirstLightImage={() => {}}
        onSelectSecondLightImage={() => {}}
        onCancelLightSelection={() => {}}
      />,
    );

    expect(screen.queryByText('Blur Templates')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: 'Template'}));
    expect(screen.getByText('Blur Templates')).toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: 'Close'}));
    expect(screen.queryByText('Blur Templates')).not.toBeInTheDocument();
  });

  it('loads on card click, then supports update and delete flow', async () => {
    const user = userEvent.setup();

    useEditorStore.setState({
      blurTemplates: [baseTemplate],
      selectedTemplateId: null,
      blurStrokes: [],
      showTemplatePanel: true,
      imageWidth: 100,
      imageHeight: 100,
    });

    render(<BlurTemplatePanel />);

    const createButton = screen.getByRole('button', {name: 'Create'});
    const updateButton = screen.getByRole('button', {name: 'Update'});

    expect(createButton).toBeDisabled();
    expect(updateButton).toBeDisabled();

    await user.click(screen.getByRole('button', {name: 'Delete template Faces'}));
    expect(useEditorStore.getState().blurStrokes).toHaveLength(0);
    expect(screen.getByText('Delete selected template permanently?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', {name: 'Cancel'}));

    await user.click(screen.getByRole('button', {name: 'Load template Faces'}));

    expect(screen.getByDisplayValue('Faces')).toBeInTheDocument();
    expect(useEditorStore.getState().selectedTemplateId).toBe(baseTemplate.id);
    expect(useEditorStore.getState().blurStrokes).toHaveLength(1);

    expect(screen.getByRole('button', {name: 'Update'})).toBeEnabled();

    await user.click(screen.getByRole('button', {name: 'Delete'}));
    expect(screen.getByText('Delete selected template permanently?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', {name: 'Confirm'}));
    expect(screen.getByText('No templates yet.')).toBeInTheDocument();
  });
});
