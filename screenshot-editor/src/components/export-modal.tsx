import {useCallback, useEffect, useState} from 'react';
import {Button} from '@/components/ui/button';
import {Download, X, Check} from 'lucide-react';

type ExportFormat = 'png' | 'webp' | 'jpg';

const ALL_FORMATS: {id: ExportFormat; label: string; mime: string; ext: string}[] = [
  {id: 'png', label: 'PNG', mime: 'image/png', ext: 'png'},
  {id: 'webp', label: 'WebP', mime: 'image/webp', ext: 'webp'},
  {id: 'jpg', label: 'JPG', mime: 'image/jpeg', ext: 'jpg'},
];

const STORAGE_KEY = 'screenshot-editor-export-formats';

function getDefaultName(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  return `screenshot_${date}`;
}

function getSavedFormats(): ExportFormat[] {
  if (typeof window === 'undefined') return ['png'];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as ExportFormat[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((f) => ALL_FORMATS.some((af) => af.id === f));
      }
    }
  } catch {
    // ignore
  }
  return ['png'];
}

function saveFormats(formats: ExportFormat[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formats));
  } catch {
    // ignore
  }
}

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  canvasRef: HTMLCanvasElement | null;
}

export function ExportModal({open, onClose, canvasRef}: ExportModalProps) {
  const [fileName, setFileName] = useState(getDefaultName);
  const [selectedFormats, setSelectedFormats] = useState<ExportFormat[]>(getSavedFormats);

  // Reset name each time the modal opens
  useEffect(() => {
    if (open) {
      setFileName(getDefaultName());
      setSelectedFormats(getSavedFormats());
    }
  }, [open]);

  const toggleFormat = useCallback((format: ExportFormat) => {
    setSelectedFormats((prev) => {
      if (prev.includes(format)) {
        // Don't allow deselecting all
        if (prev.length === 1) return prev;
        return prev.filter((f) => f !== format);
      }
      return [...prev, format];
    });
  }, []);

  const handleExport = useCallback(() => {
    if (!canvasRef) return;

    saveFormats(selectedFormats);

    for (const formatId of selectedFormats) {
      const format = ALL_FORMATS.find((f) => f.id === formatId);
      if (!format) continue;

      const dataUrl = canvasRef.toDataURL(format.mime, format.id === 'jpg' ? 0.92 : undefined);
      const link = document.createElement('a');
      link.download = `${fileName.trim() || 'screenshot'}.${format.ext}`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    onClose();
  }, [canvasRef, selectedFormats, fileName, onClose]);

  // Close on escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onClose();
        }}
        role="button"
        tabIndex={0}
        aria-label="Close export modal"
      />

      {/* Modal */}
      <div className="bg-card border-border relative w-[420px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border shadow-2xl">
        {/* Header */}
        <div className="border-border flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-foreground text-sm font-semibold">Export Image</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground hover:bg-secondary flex h-7 w-7 items-center justify-center rounded-md transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-5 px-5 py-5">
          {/* File name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="export-filename" className="text-muted-foreground text-xs font-medium">
              File name
            </label>
            <input
              id="export-filename"
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleExport();
              }}
              className="bg-secondary text-foreground border-border focus:ring-primary placeholder:text-muted-foreground h-9 rounded-lg border px-3 text-sm outline-none focus:ring-1"
              placeholder="screenshot"
              autoFocus
            />
          </div>

          {/* Formats */}
          <div className="flex flex-col gap-2">
            <span className="text-muted-foreground text-xs font-medium">
              Format{selectedFormats.length > 1 ? 's' : ''}
            </span>
            <div className="flex gap-2">
              {ALL_FORMATS.map((format) => {
                const isSelected = selectedFormats.includes(format.id);
                return (
                  <button
                    key={format.id}
                    type="button"
                    onClick={() => toggleFormat(format.id)}
                    className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-secondary border-border text-secondary-foreground hover:border-muted-foreground'
                    }`}>
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                    {format.label}
                  </button>
                );
              })}
            </div>
            <p className="text-muted-foreground text-[11px]">
              Selected formats will be remembered for next time.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-border flex items-center justify-end gap-2 border-t px-5 py-4">
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 px-4 text-xs"
            onClick={handleExport}
            disabled={selectedFormats.length === 0}>
            <Download className="mr-1.5 h-3 w-3" />
            Export {selectedFormats.length > 1 ? `${selectedFormats.length} files` : ''}
          </Button>
        </div>
      </div>
    </div>
  );
}
