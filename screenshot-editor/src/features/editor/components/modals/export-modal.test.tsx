import {act, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {ExportModal} from '@/features/editor/components/modals/export-modal';
import {useEditorStore} from '@/features/editor/state/use-editor-store';

const LEAVE_AFTER_EXPORT_STORAGE_KEY = 'screenshot-editor-export-leave-after-v1';

function openModal() {
  useEditorStore.setState({
    showExportModal: true,
    exportBaseName: 'pair-export',
    image1: 'data:image/png;base64,light',
    image2: 'data:image/png;base64,dark',
  });
}

function createCanvasStub() {
  return {
    toDataURL: vi.fn(() => 'data:image/png;base64,abc'),
  } as unknown as HTMLCanvasElement;
}

describe('ExportModal', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults leave-after-export to enabled when no preference is saved', () => {
    localStorage.removeItem(LEAVE_AFTER_EXPORT_STORAGE_KEY);
    openModal();

    render(<ExportModal canvasRef={createCanvasStub()} />);

    const leaveButton = screen.getByRole('button', {name: 'Leave editor after export'});
    expect(leaveButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('persists leave-after-export preference and reports it on export', async () => {
    const user = userEvent.setup();
    const exportComplete = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    localStorage.removeItem(LEAVE_AFTER_EXPORT_STORAGE_KEY);
    openModal();
    render(<ExportModal canvasRef={createCanvasStub()} onExportComplete={exportComplete} />);

    const leaveButton = screen.getByRole('button', {name: 'Leave editor after export'});
    await user.click(leaveButton);
    expect(leaveButton).toHaveAttribute('aria-pressed', 'false');

    await user.click(screen.getByRole('button', {name: /^Export/}));
    expect(exportComplete).toHaveBeenCalledWith({leaveAfterExport: false});
    expect(localStorage.getItem(LEAVE_AFTER_EXPORT_STORAGE_KEY)).toBe('0');

    act(() => {
      useEditorStore.getState().openExportModal();
    });
    expect(await screen.findByRole('button', {name: 'Leave editor after export'})).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});
