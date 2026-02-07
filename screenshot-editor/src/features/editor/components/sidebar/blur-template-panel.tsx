import {useEffect, useMemo, useState} from 'react';
import {Trash2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Label} from '@/components/ui/label';
import {useEditorStore} from '@/features/editor/state/use-editor-store';

export function BlurTemplatePanel() {
  const blurTemplates = useEditorStore((state) => state.blurTemplates);
  const selectedTemplateId = useEditorStore((state) => state.selectedTemplateId);
  const blurStrokes = useEditorStore((state) => state.blurStrokes);

  const setTemplatePanelOpen = useEditorStore((state) => state.setTemplatePanelOpen);
  const setSelectedTemplate = useEditorStore((state) => state.setSelectedTemplate);
  const createBlurTemplate = useEditorStore((state) => state.createBlurTemplate);
  const updateBlurTemplate = useEditorStore((state) => state.updateBlurTemplate);
  const deleteBlurTemplate = useEditorStore((state) => state.deleteBlurTemplate);
  const loadBlurTemplate = useEditorStore((state) => state.loadBlurTemplate);

  const [templateName, setTemplateName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const selectedTemplate = useMemo(
    () => blurTemplates.find((template) => template.id === selectedTemplateId) ?? null,
    [blurTemplates, selectedTemplateId],
  );

  useEffect(() => {
    if (selectedTemplate) {
      setTemplateName(selectedTemplate.name);
    }
  }, [selectedTemplate]);

  const canCreateOrUpdate = blurStrokes.length > 0;

  const handleCreate = () => {
    const result = createBlurTemplate(templateName);
    if (!result.ok) {
      setError(result.error ?? 'Failed to create template.');
      return;
    }
    setError(null);
    setConfirmDelete(false);
  };

  const handleUpdate = () => {
    if (!selectedTemplateId) {
      setError('Select a template first.');
      return;
    }

    const result = updateBlurTemplate(selectedTemplateId, templateName);
    if (!result.ok) {
      setError(result.error ?? 'Failed to update template.');
      return;
    }
    setError(null);
    setConfirmDelete(false);
  };

  const handleDelete = () => {
    if (!selectedTemplateId) {
      setError('Select a template first.');
      return;
    }

    const result = deleteBlurTemplate(selectedTemplateId);
    if (!result.ok) {
      setError(result.error ?? 'Failed to delete template.');
      return;
    }

    setError(null);
    setConfirmDelete(false);
    setTemplateName('');
  };

  const handleTemplateLoad = (templateId: string) => {
    const result = loadBlurTemplate(templateId);
    if (!result.ok) {
      setError(result.error ?? 'Failed to load template.');
      return;
    }
    setError(null);
    setConfirmDelete(false);
  };

  return (
    <aside
      className="border-border flex h-full w-64 flex-shrink-0 flex-col overflow-y-auto border-l-2"
      style={{background: 'oklch(var(--sidebar-background))'}}>
      <div className="border-border flex items-center justify-between border-b-2 p-4">
        <h3 className="text-foreground text-sm font-semibold">Blur Templates</h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => setTemplatePanelOpen(false)}>
          Close
        </Button>
      </div>

      <div className="border-border border-b-2 p-4">
        <Label className="text-muted-foreground mb-2 block text-xs">Template Name</Label>
        <input
          type="text"
          value={templateName}
          onChange={(event) => setTemplateName(event.target.value)}
          placeholder="e.g. Faces"
          className="bg-secondary text-foreground border-border focus:ring-primary placeholder:text-muted-foreground h-8 w-full border-2 px-2 text-xs outline-none focus:ring-1"
        />

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={handleCreate}
            disabled={!canCreateOrUpdate}>
            Create
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="h-8 text-xs"
            onClick={handleUpdate}
            disabled={!canCreateOrUpdate || !selectedTemplateId}>
            Update
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="col-span-2 h-8 text-xs"
            onClick={() => setConfirmDelete((value) => !value)}
            disabled={!selectedTemplateId}>
            Delete
          </Button>
        </div>

        {confirmDelete && selectedTemplateId && (
          <div className="border-border mt-3 border-2 p-2">
            <p className="text-muted-foreground text-[11px]">
              Delete selected template permanently?
            </p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" className="h-7 px-2 text-xs" onClick={handleDelete}>
                Confirm
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {error && <p className="text-destructive mt-2 text-[11px]">{error}</p>}

        {!canCreateOrUpdate && (
          <p className="text-muted-foreground mt-2 text-[11px]">
            Create at least one blur stroke to create or update templates.
          </p>
        )}
      </div>

      <div className="p-4">
        <h4 className="text-muted-foreground mb-2 text-xs font-semibold">Saved Templates</h4>

        {blurTemplates.length === 0 ? (
          <p className="text-muted-foreground text-[11px]">No templates yet.</p>
        ) : (
          <div className="space-y-2">
            {blurTemplates.map((template) => {
              const selected = template.id === selectedTemplateId;
              return (
                <div
                  key={template.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Load template ${template.name}`}
                  onClick={() => {
                    handleTemplateLoad(template.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleTemplateLoad(template.id);
                    }
                  }}
                  className={`border-border w-full border-2 px-2 py-2 text-left shadow-[2px_2px_0_0_rgba(0,0,0,0.65)] transition-colors ${
                    selected
                      ? 'bg-primary/15 border-primary'
                      : 'bg-secondary/40 hover:bg-secondary border-border'
                  }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-foreground text-xs font-medium">{template.name}</div>
                    <button
                      type="button"
                      aria-label={`Delete template ${template.name}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedTemplate(template.id);
                        setError(null);
                        setConfirmDelete(true);
                      }}
                      className="text-muted-foreground hover:text-destructive rounded p-0.5 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="text-muted-foreground mt-1 text-[10px]">
                    {template.strokes.length} stroke{template.strokes.length === 1 ? '' : 's'}
                  </div>
                  <div className="text-muted-foreground text-[10px]">
                    Updated {new Date(template.updatedAt).toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
