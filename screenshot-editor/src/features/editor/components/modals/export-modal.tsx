import {useCallback, useEffect, useState} from 'react';
import {Check, Download, X} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {ModalShell} from '@/features/editor/components/modals/modal-shell';
import {useCloseOnEscape} from '@/features/editor/hooks/use-close-on-escape';
import {
  loadExportFormats,
  loadLeaveAfterExport,
  saveExportFormats,
  saveLeaveAfterExport,
  type ExportFormat,
} from '@/features/editor/state/export-preferences-storage';
import {useEditorStore} from '@/features/editor/state/use-editor-store';

const ALL_FORMATS: {id: ExportFormat; label: string; mime: string; ext: string}[] = [
  {id: 'png', label: 'PNG', mime: 'image/png', ext: 'png'},
  {id: 'webp', label: 'WebP', mime: 'image/webp', ext: 'webp'},
  {id: 'jpg', label: 'JPG', mime: 'image/jpeg', ext: 'jpg'},
];

function getDefaultName() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  return `screenshot_${date}`;
}

interface ExportModalProps {
  canvasRef: HTMLCanvasElement | null;
  onExportComplete?: (payload: {leaveAfterExport: boolean}) => void;
}

export function ExportModal({canvasRef, onExportComplete}: ExportModalProps) {
  const open = useEditorStore((state) => state.showExportModal);
  const exportBaseName = useEditorStore((state) => state.exportBaseName);
  const hasSplitImage = useEditorStore((state) => Boolean(state.image2));
  const closeExportModal = useEditorStore((state) => state.closeExportModal);
  const [fileName, setFileName] = useState(getDefaultName);
  const [selectedFormats, setSelectedFormats] = useState<ExportFormat[]>(() =>
    loadExportFormats(['png']),
  );
  const [leaveAfterExport, setLeaveAfterExport] = useState<boolean>(() =>
    loadLeaveAfterExport(true),
  );

  useCloseOnEscape(open, closeExportModal);

  useEffect(() => {
    if (!open) return;
    setFileName(exportBaseName || getDefaultName());
    setSelectedFormats(loadExportFormats(['png']));
    setLeaveAfterExport(loadLeaveAfterExport(true));
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

    saveExportFormats(selectedFormats);
    saveLeaveAfterExport(leaveAfterExport);

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
    onExportComplete?.({leaveAfterExport});
  }, [canvasRef, closeExportModal, fileName, leaveAfterExport, onExportComplete, selectedFormats]);

  if (!open) return null;

  return (
    <ModalShell onClose={closeExportModal} overlayAriaLabel="Close export modal">
      <div>
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

          <div className="border-border bg-secondary/35 flex flex-col gap-2 border-2 p-3">
            <button
              type="button"
              onClick={() => setLeaveAfterExport((current) => !current)}
              aria-pressed={leaveAfterExport}
              className="text-foreground flex items-center gap-2 text-left text-sm font-medium">
              <span
                className={`flex h-5 w-5 items-center justify-center border-2 ${
                  leaveAfterExport
                    ? 'bg-primary/15 border-primary text-primary'
                    : 'border-border bg-background text-transparent'
                }`}>
                <Check className="h-3.5 w-3.5" />
              </span>
              Leave editor after export
            </button>
            <p className="text-muted-foreground text-[11px]">
              If enabled, export returns to library when present, otherwise to upload.
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
    </ModalShell>
  );
}
