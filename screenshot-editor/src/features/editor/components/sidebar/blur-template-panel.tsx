import {Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import type {DragEvent} from 'react';
import {Trash2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Label} from '@/components/ui/label';
import {formatShortcutKeys} from '@/features/editor/lib/shortcut-definitions';
import {useEditorStore} from '@/features/editor/state/use-editor-store';

export function BlurTemplatePanel() {
  const blurTemplates = useEditorStore((state) => state.blurTemplates);
  const selectedTemplateId = useEditorStore((state) => state.selectedTemplateId);
  const blurStrokes = useEditorStore((state) => state.blurStrokes);

  const setTemplatePanelOpen = useEditorStore((state) => state.setTemplatePanelOpen);
  const setSelectedTemplate = useEditorStore((state) => state.setSelectedTemplate);
  const createBlurTemplate = useEditorStore((state) => state.createBlurTemplate);
  const updateBlurTemplate = useEditorStore((state) => state.updateBlurTemplate);
  const reorderBlurTemplates = useEditorStore((state) => state.reorderBlurTemplates);
  const deleteBlurTemplate = useEditorStore((state) => state.deleteBlurTemplate);
  const loadBlurTemplate = useEditorStore((state) => state.loadBlurTemplate);

  const [templateName, setTemplateName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const previousTopById = useRef<Record<string, number>>({});

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
  const activeDropIndex =
    draggedIndex === null
      ? null
      : Math.max(0, Math.min(dragOverIndex ?? draggedIndex, blurTemplates.length - 1));
  const placeholderIndex =
    draggedIndex === null || activeDropIndex === null
      ? null
      : activeDropIndex + (activeDropIndex > draggedIndex ? 1 : 0);

  useLayoutEffect(() => {
    const nextTopById: Record<string, number> = {};

    for (const template of blurTemplates) {
      const card = cardRefs.current[template.id];
      if (!card) continue;

      const nextTop = card.getBoundingClientRect().top;
      nextTopById[template.id] = nextTop;
      const previousTop = previousTopById.current[template.id];
      if (previousTop === undefined) continue;

      const deltaY = previousTop - nextTop;
      if (Math.abs(deltaY) < 1) continue;

      card.style.transition = 'none';
      card.style.transform = `translateY(${deltaY}px)`;

      requestAnimationFrame(() => {
        card.style.transition = 'transform 140ms cubic-bezier(0.22, 1, 0.36, 1)';
        card.style.transform = '';
      });
    }

    previousTopById.current = nextTopById;
  }, [blurTemplates, placeholderIndex]);

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

  const resetDragState = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const getDropIndexFromCard = (event: DragEvent<HTMLDivElement>, index: number): number => {
    const rect = event.currentTarget.getBoundingClientRect();
    const isAfterMidpoint = event.clientY > rect.top + rect.height / 2;
    let nextDropIndex = index + (isAfterMidpoint ? 1 : 0);

    if (draggedIndex !== null && nextDropIndex > draggedIndex) {
      nextDropIndex -= 1;
    }

    return Math.max(0, Math.min(nextDropIndex, blurTemplates.length - 1));
  };

  const commitReorder = (dropIndex: number) => {
    if (draggedIndex === null) {
      resetDragState();
      return;
    }

    const result = reorderBlurTemplates(draggedIndex, dropIndex);
    if (!result.ok) {
      setError(result.error ?? 'Failed to reorder template.');
    } else {
      setError(null);
    }
    resetDragState();
  };

  const handleTemplateDragStart = (event: DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    setDragOverIndex(index);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  };

  const handleTemplateDragOver = (event: DragEvent<HTMLDivElement>, index: number) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const dropIndex = getDropIndexFromCard(event, index);
    if (dragOverIndex !== dropIndex) {
      setDragOverIndex(dropIndex);
    }
  };

  const handleTemplateDrop = (event: DragEvent<HTMLDivElement>, index: number) => {
    event.preventDefault();
    event.stopPropagation();
    const dropIndex = getDropIndexFromCard(event, index);
    commitReorder(dropIndex);
  };

  const handleListDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (draggedIndex === null) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    if (event.target === event.currentTarget) {
      const firstTemplateId = blurTemplates[0]?.id;
      const lastTemplateId = blurTemplates[blurTemplates.length - 1]?.id;
      const firstCard = firstTemplateId ? cardRefs.current[firstTemplateId] : null;
      const lastCard = lastTemplateId ? cardRefs.current[lastTemplateId] : null;
      if (!firstCard || !lastCard) return;

      const firstRect = firstCard.getBoundingClientRect();
      const lastRect = lastCard.getBoundingClientRect();

      let boundaryDropIndex: number | null = null;
      if (event.clientY <= firstRect.top) {
        boundaryDropIndex = 0;
      } else if (event.clientY >= lastRect.bottom) {
        boundaryDropIndex = blurTemplates.length - 1;
      }

      if (boundaryDropIndex !== null && dragOverIndex !== boundaryDropIndex) {
        setDragOverIndex(boundaryDropIndex);
      }
    }
  };

  const handleListDrop = (event: DragEvent<HTMLDivElement>) => {
    if (draggedIndex === null) return;
    event.preventDefault();
    if (event.target !== event.currentTarget) return;
    commitReorder(activeDropIndex ?? draggedIndex);
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
          <div className="space-y-2" onDragOver={handleListDragOver} onDrop={handleListDrop}>
            {blurTemplates.map((template, index) => {
              const selected = template.id === selectedTemplateId;
              return (
                <Fragment key={template.id}>
                  {placeholderIndex === index && (
                    <div
                      aria-hidden="true"
                      className="border-primary/70 bg-primary/10 pointer-events-none h-10 w-full rounded border-2 border-dashed transition-all duration-100"
                    />
                  )}
                  <div
                    ref={(node) => {
                      cardRefs.current[template.id] = node;
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Load template ${template.name}`}
                    draggable
                    onDragStart={(event) => handleTemplateDragStart(event, index)}
                    onDragOver={(event) => handleTemplateDragOver(event, index)}
                    onDrop={(event) => handleTemplateDrop(event, index)}
                    onDragEnd={resetDragState}
                    onClick={() => {
                      handleTemplateLoad(template.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleTemplateLoad(template.id);
                      }
                    }}
                    className={`w-full border-2 px-2 py-2 text-left shadow-[2px_2px_0_0_rgba(0,0,0,0.65)] transition-[opacity,background-color,border-color] ${
                      selected
                        ? 'bg-primary/15 border-primary'
                        : 'bg-secondary/40 hover:bg-secondary border-border'
                    } ${draggedIndex === index ? 'scale-[0.99] cursor-grabbing opacity-45' : 'cursor-grab'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground text-[10px] font-semibold">
                            #{index + 1}
                          </span>
                          <div className="text-foreground truncate text-xs font-medium">
                            {template.name}
                          </div>
                        </div>
                        {index < 9 && (
                          <kbd className="bg-secondary text-secondary-foreground mt-1 inline-flex rounded px-1.5 py-0.5 font-mono text-[10px]">
                            {formatShortcutKeys(`MOD+${index + 1}`)}
                          </kbd>
                        )}
                      </div>
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
                </Fragment>
              );
            })}
            {placeholderIndex === blurTemplates.length && (
              <div
                aria-hidden="true"
                className="border-primary/70 bg-primary/10 pointer-events-none h-10 w-full rounded border-2 border-dashed transition-all duration-100"
              />
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
