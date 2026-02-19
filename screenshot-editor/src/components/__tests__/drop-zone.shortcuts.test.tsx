import {fireEvent, render} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('forwards all selected image files to the upload handler', async () => {
    const user = userEvent.setup();
    const onImagesLoaded = vi.fn();
    const {container} = render(<DropZone onImagesLoaded={onImagesLoaded} />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    const files = [
      new File(['a'], 'one.png', {type: 'image/png'}),
      new File(['b'], 'two.png', {type: 'image/png'}),
      new File(['c'], 'three.jpg', {type: 'image/jpeg'}),
    ];
    await user.upload(fileInput, files);

    expect(onImagesLoaded).toHaveBeenCalledTimes(1);
    expect(onImagesLoaded.mock.calls[0][0]).toHaveLength(3);
  });
});
