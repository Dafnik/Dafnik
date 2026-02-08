import {fireEvent, render} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {DropZone} from '@/components/drop-zone';

describe('DropZone shortcuts', () => {
  it('opens file dialog with Ctrl+U', () => {
    const {container} = render(<DropZone onImagesLoaded={() => {}} />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(fileInput, 'click');

    fireEvent.keyDown(window, {key: 'u', code: 'KeyU', ctrlKey: true});

    expect(clickSpy).toHaveBeenCalled();
  });
});
