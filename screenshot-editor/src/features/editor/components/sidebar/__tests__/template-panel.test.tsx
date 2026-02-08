import {fireEvent, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {describe, expect, it} from 'vitest';
import {EditorLayout} from '@/features/editor/components/layout/editor-layout';
import {BlurTemplatePanel} from '@/features/editor/components/sidebar/blur-template-panel';
import {formatShortcutKeys} from '@/features/editor/lib/shortcut-definitions';
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

  it('reorders templates with drag and drop, updates slot labels, and preserves actions', async () => {
    const user = userEvent.setup();

    const secondTemplate: BlurTemplate = {
      ...baseTemplate,
      id: 'template-2',
      name: 'Names',
      updatedAt: '2026-02-08T00:00:00.000Z',
    };

    useEditorStore.setState({
      blurTemplates: [baseTemplate, secondTemplate],
      selectedTemplateId: null,
      blurStrokes: [],
      showTemplatePanel: true,
      imageWidth: 100,
      imageHeight: 100,
    });

    render(<BlurTemplatePanel />);

    const firstCardBefore = screen.getByRole('button', {name: 'Load template Faces'});
    const secondCardBefore = screen.getByRole('button', {name: 'Load template Names'});
    const dataTransfer = {
      setData: () => {},
      getData: () => '',
      effectAllowed: 'move',
      dropEffect: 'move',
    } as unknown as DataTransfer;

    fireEvent.dragStart(secondCardBefore, {dataTransfer});
    fireEvent.dragOver(firstCardBefore, {dataTransfer});
    fireEvent.drop(firstCardBefore, {dataTransfer});
    fireEvent.dragEnd(secondCardBefore, {dataTransfer});

    expect(useEditorStore.getState().blurTemplates.map((template) => template.id)).toEqual([
      'template-2',
      'template-1',
    ]);

    const firstCardAfter = screen.getByRole('button', {name: 'Load template Names'});
    const secondCardAfter = screen.getByRole('button', {name: 'Load template Faces'});

    expect(within(firstCardAfter).getByText('#1')).toBeInTheDocument();
    expect(within(firstCardAfter).getByText(formatShortcutKeys('MOD+1'))).toBeInTheDocument();
    expect(within(secondCardAfter).getByText('#2')).toBeInTheDocument();
    expect(within(secondCardAfter).getByText(formatShortcutKeys('MOD+2'))).toBeInTheDocument();

    await user.click(firstCardAfter);
    expect(useEditorStore.getState().selectedTemplateId).toBe('template-2');
    expect(useEditorStore.getState().blurStrokes).toHaveLength(1);

    await user.click(screen.getByRole('button', {name: 'Delete template Names'}));
    expect(screen.getByText('Delete selected template permanently?')).toBeInTheDocument();
  });
});
