import {useCallback, useEffect, useState} from 'react';
import {Check, Download, X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {useEditorStore} from '@/features/editor/state/use-editor-store';

type ExportFormat = 'png' | 'webp' | 'jpg';

const ALL_FORMATS: {id: ExportFormat; label: string; mime: string; ext: string}[] = [
  {id: 'png', label: 'PNG', mime: 'image/png', ext: 'png'},
  {id: 'webp', label: 'WebP', mime: 'image/webp', ext: 'webp'},
  {id: 'jpg', label: 'JPG', mime: 'image/jpeg', ext: 'jpg'},
];

const STORAGE_KEY = 'screenshot-editor-export-formats';

function getDefaultName() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  return `screenshot_${date}`;
}

function getSavedFormats(): ExportFormat[] {
  if (typeof window === 'undefined') return ['png'];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return ['png'];

    const parsed = JSON.parse(raw) as ExportFormat[];
    if (!Array.isArray(parsed) || parsed.length === 0) return ['png'];

    return parsed.filter((format) => ALL_FORMATS.some((item) => item.id === format));
  } catch {
    return ['png'];
  }
}

function saveFormats(formats: ExportFormat[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formats));
  } catch {
    // ignore storage failures
  }
}

interface ExportModalProps {
  canvasRef: HTMLCanvasElement | null;
}

export function ExportModal({canvasRef}: ExportModalProps) {
  const open = useEditorStore((state) => state.showExportModal);
  const exportBaseName = useEditorStore((state) => state.exportBaseName);
  const hasSplitImage = useEditorStore((state) => Boolean(state.image2));
  const closeExportModal = useEditorStore((state) => state.closeExportModal);
  const [fileName, setFileName] = useState(getDefaultName);
  const [selectedFormats, setSelectedFormats] = useState<ExportFormat[]>(getSavedFormats);

  useEffect(() => {
    if (!open) return;
    setFileName(exportBaseName || getDefaultName());
    setSelectedFormats(getSavedFormats());
  }, [exportBaseName, open]);

  const toggleFormat = useCallback((format: ExportFormat) => {
    setSelectedFormats((prev) => {
      if (prev.includes(format)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== format);
      }
      return [...prev, format];
    });
  }, []);

  const handleExport = useCallback(() => {
    if (!canvasRef) return;

    saveFormats(selectedFormats);

    for (const formatId of selectedFormats) {
      const format = ALL_FORMATS.find((item) => item.id === formatId);
      if (!format) continue;

      const dataUrl = canvasRef.toDataURL(format.mime, format.id === 'jpg' ? 0.92 : undefined);
      const link = document.createElement('a');
      link.download = `${fileName.trim() || 'screenshot'}.${format.ext}`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    closeExportModal();
  }, [canvasRef, closeExportModal, fileName, selectedFormats]);

  useEffect(() => {
    if (!open) return;

    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeExportModal();
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeExportModal, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeExportModal}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') closeExportModal();
        }}
        role="button"
        tabIndex={0}
        aria-label="Close export modal"
      />

      <div className="bg-card border-border relative w-[420px] max-w-[calc(100vw-2rem)] overflow-hidden border-4 shadow-[10px_10px_0_0_rgba(0,0,0,0.75)]">
        <div className="border-border flex items-center justify-between border-b-2 px-5 py-4">
          <h2 className="text-foreground text-sm font-semibold">Export Image</h2>
          <button
            type="button"
            onClick={closeExportModal}
            className="text-muted-foreground hover:text-foreground hover:bg-secondary border-border flex h-7 w-7 items-center justify-center border-2 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-5 px-5 py-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="export-filename" className="text-muted-foreground text-xs font-medium">
              File name
            </label>
            <input
              id="export-filename"
              type="text"
              value={fileName}
              onChange={(event) => setFileName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleExport();
              }}
              className="bg-secondary text-foreground border-border focus:ring-primary placeholder:text-muted-foreground h-9 border-2 px-3 text-sm outline-none focus:ring-1"
              placeholder="screenshot"
              autoFocus
            />
            <p className="text-muted-foreground mt-1 text-[11px]">
              Tip:{' '}
              {hasSplitImage
                ? 'In split mode, the default name is derived from the shared prefix of both uploads.'
                : 'Upload two matching files in split mode to auto-derive a shared prefix name.'}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-muted-foreground text-xs font-medium">
              Format{selectedFormats.length > 1 ? 's' : ''}
            </span>
            <div className="flex gap-2">
              {ALL_FORMATS.map((format) => {
                const selected = selectedFormats.includes(format.id);

                return (
                  <button
                    key={format.id}
                    type="button"
                    onClick={() => toggleFormat(format.id)}
                    className={`flex h-10 flex-1 items-center justify-center gap-1.5 border-2 text-sm font-semibold transition-all ${
                      selected
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-secondary border-border text-secondary-foreground hover:border-muted-foreground'
                    }`}>
                    {selected && <Check className="h-3.5 w-3.5" />}
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

        <div className="border-border flex items-center justify-end gap-2 border-t-2 px-5 py-4">
          <Button variant="ghost" size="sm" onClick={closeExportModal} className="h-8 text-xs">
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
