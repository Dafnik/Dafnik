import type {KeyboardEvent, ReactNode} from 'react';

interface ModalShellProps {
  onClose: () => void;
  children: ReactNode;
  containerClassName?: string;
  overlayAriaLabel: string;
}

export function ModalShell({
  onClose,
  children,
  containerClassName = 'w-[420px] max-w-[calc(100vw-2rem)]',
  overlayAriaLabel,
}: ModalShellProps) {
  const handleOverlayKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        onKeyDown={handleOverlayKeyDown}
        role="button"
        tabIndex={0}
        aria-label={overlayAriaLabel}
      />

      <div
        className={`bg-card border-border relative overflow-hidden border-4 shadow-[10px_10px_0_0_rgba(0,0,0,0.75)] ${containerClassName}`}>
        {children}
      </div>
    </div>
  );
}
