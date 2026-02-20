import {render} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import {useOpenUploadShortcut} from '@/features/editor/hooks/use-open-upload-shortcut';

function HookHarness({onOpen, withInput = false}: {onOpen: () => void; withInput?: boolean}) {
  useOpenUploadShortcut({onOpen});

  return withInput ? <input aria-label="typing-input" defaultValue="" /> : <div>ready</div>;
}

describe('useOpenUploadShortcut', () => {
  it('opens upload when shortcut is pressed outside typing fields', () => {
    const onOpen = vi.fn();
    render(<HookHarness onOpen={onOpen} />);

    window.dispatchEvent(new KeyboardEvent('keydown', {key: 'u', ctrlKey: true, bubbles: true}));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('ignores shortcut when focus is in a typing element', () => {
    const onOpen = vi.fn();
    const {getByLabelText} = render(<HookHarness onOpen={onOpen} withInput />);

    const input = getByLabelText('typing-input') as HTMLInputElement;
    input.focus();
    input.dispatchEvent(new KeyboardEvent('keydown', {key: 'u', ctrlKey: true, bubbles: true}));

    expect(onOpen).not.toHaveBeenCalled();
  });
});
