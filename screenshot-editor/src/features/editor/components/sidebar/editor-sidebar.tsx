import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {createEmailBlurStrokes} from '@/features/editor/lib/email-blur-strokes';
import {formatShortcutTooltip} from '@/features/editor/lib/shortcut-definitions';
import {detectEmailsInImage} from '@/features/editor/services/email-detection';
import type {BlurType} from '@/features/editor/state/types';
import {useEditorStore} from '@/features/editor/state/use-editor-store';
import {BlurTemplatePanel} from './blur-template-panel';
import {BlurSettingsSection} from './editor-sidebar/blur-settings-section';
import {ShortcutsSection} from './editor-sidebar/shortcuts-section';
import {ToolSection} from './editor-sidebar/tool-section';

interface EditorSidebarProps {
  selectedStrokeIndices: number[];
}

export function EditorSidebar({selectedStrokeIndices}: EditorSidebarProps) {
  const pendingSelectedStrengthHistoryRef = useRef(false);
  const [isAutoBlurEmailsPending, setIsAutoBlurEmailsPending] = useState(false);
  const [autoBlurEmailsStatus, setAutoBlurEmailsStatus] = useState<string | undefined>(undefined);

  const image1 = useEditorStore((state) => state.image1);
  const image2 = useEditorStore((state) => state.image2);
  const imageWidth = useEditorStore((state) => state.imageWidth);
  const imageHeight = useEditorStore((state) => state.imageHeight);
  const activeTool = useEditorStore((state) => state.activeTool);
  const blurType = useEditorStore((state) => state.blurType);
  const blurStrokeShape = useEditorStore((state) => state.blurStrokeShape);
  const brushRadius = useEditorStore((state) => state.brushRadius);
  const brushStrength = useEditorStore((state) => state.brushStrength);
  const isShiftPressed = useEditorStore((state) => state.isShiftPressed);
  const blurStrokes = useEditorStore((state) => state.blurStrokes);
  const splitRatio = useEditorStore((state) => state.splitRatio);
  const splitDirection = useEditorStore((state) => state.splitDirection);
  const showBlurOutlines = useEditorStore((state) => state.showBlurOutlines);

  const setActiveTool = useEditorStore((state) => state.setActiveTool);
  const setBlurType = useEditorStore((state) => state.setBlurType);
  const setBlurStrokeShape = useEditorStore((state) => state.setBlurStrokeShape);
  const setBrushRadius = useEditorStore((state) => state.setBrushRadius);
  const setBrushStrength = useEditorStore((state) => state.setBrushStrength);
  const updateBlurStrokesAtIndices = useEditorStore((state) => state.updateBlurStrokesAtIndices);
  const appendBlurStrokes = useEditorStore((state) => state.appendBlurStrokes);
  const pushHistorySnapshot = useEditorStore((state) => state.pushHistorySnapshot);
  const clearBlurStrokes = useEditorStore((state) => state.clearBlurStrokes);
  const setShowBlurOutlines = useEditorStore((state) => state.setShowBlurOutlines);
  const openShortcutsModal = useEditorStore((state) => state.openShortcutsModal);

  const switchToolTooltip = formatShortcutTooltip('Switch tool', ['switch-tool']);
  const modeTooltip = 'Hold Shift to temporarily switch modes';
  const blurTypeTooltip = formatShortcutTooltip('Toggle blur type', ['toggle-blur-type']);
  const outlinesTooltip = formatShortcutTooltip('Toggle outlines', ['toggle-outlines']);
  const radiusTooltip = formatShortcutTooltip('Radius +/-', ['radius-step']);
  const strengthTooltip = formatShortcutTooltip('Strength +/-', ['strength-step']);
  const shortcutsTooltip = formatShortcutTooltip('Shortcuts', ['shortcuts-modal']);
  const autoBlurEmailsTooltip = 'Auto blur emails';

  const validSelectedStrokeIndices = useMemo(() => {
    const unique = [...new Set(selectedStrokeIndices)];
    return unique
      .filter((index) => Number.isInteger(index))
      .filter((index) => index >= 0 && index < blurStrokes.length);
  }, [blurStrokes.length, selectedStrokeIndices]);

  const isSelectToolWithSelection =
    activeTool === 'select' && validSelectedStrokeIndices.length > 0;
  const effectiveBlurStrokeShape =
    activeTool === 'blur' && isShiftPressed
      ? blurStrokeShape === 'brush'
        ? 'box'
        : 'brush'
      : blurStrokeShape;
  const canEditBlurMode = activeTool === 'blur';
  const canEditBlurType = activeTool === 'blur' || isSelectToolWithSelection;
  const canEditStrength = activeTool === 'blur' || isSelectToolWithSelection;
  const canEditRadius = activeTool === 'blur' && effectiveBlurStrokeShape === 'brush';
  const outlinesForcedOn = activeTool === 'select';
  const outlinesTogglePressed = outlinesForcedOn || showBlurOutlines;
  const selectedSourceStroke = isSelectToolWithSelection
    ? (blurStrokes[validSelectedStrokeIndices[0]] ?? null)
    : null;
  const displayedBlurType = selectedSourceStroke?.blurType ?? blurType;
  const displayedStrength = selectedSourceStroke?.strength ?? brushStrength;
  const canAutoBlurEmails = Boolean(image1) && imageWidth > 0 && imageHeight > 0;
  const autoBlurEmailsDisabled =
    !canAutoBlurEmails || activeTool !== 'blur' || isAutoBlurEmailsPending;

  const handleBlurTypeChange = useCallback(
    (nextType: BlurType) => {
      if (isSelectToolWithSelection) {
        updateBlurStrokesAtIndices(
          validSelectedStrokeIndices,
          {blurType: nextType},
          {commitHistory: true},
        );
        return;
      }
      if (activeTool === 'blur') {
        setBlurType(nextType);
      }
    },
    [
      activeTool,
      isSelectToolWithSelection,
      setBlurType,
      updateBlurStrokesAtIndices,
      validSelectedStrokeIndices,
    ],
  );

  const handleStrengthChange = useCallback(
    (nextStrength: number) => {
      if (isSelectToolWithSelection) {
        const changed = updateBlurStrokesAtIndices(
          validSelectedStrokeIndices,
          {strength: nextStrength},
          {commitHistory: false},
        );
        if (changed) {
          pendingSelectedStrengthHistoryRef.current = true;
        }
        return;
      }
      if (activeTool === 'blur') {
        setBrushStrength(nextStrength);
      }
    },
    [
      activeTool,
      isSelectToolWithSelection,
      setBrushStrength,
      updateBlurStrokesAtIndices,
      validSelectedStrokeIndices,
    ],
  );

  const handleStrengthCommit = useCallback(
    (nextStrength: number) => {
      if (!isSelectToolWithSelection) return;

      const changed = updateBlurStrokesAtIndices(
        validSelectedStrokeIndices,
        {strength: nextStrength},
        {commitHistory: false},
      );
      if (changed) {
        pendingSelectedStrengthHistoryRef.current = true;
      }

      if (pendingSelectedStrengthHistoryRef.current) {
        pushHistorySnapshot();
        pendingSelectedStrengthHistoryRef.current = false;
      }
    },
    [
      isSelectToolWithSelection,
      pushHistorySnapshot,
      updateBlurStrokesAtIndices,
      validSelectedStrokeIndices,
    ],
  );

  const handleAutoBlurEmails = useCallback(() => {
    if (!image1 || imageWidth <= 0 || imageHeight <= 0 || isAutoBlurEmailsPending) return;

    setIsAutoBlurEmailsPending(true);
    setAutoBlurEmailsStatus(undefined);

    void (async () => {
      try {
        const matches = await detectEmailsInImage({
          image1,
          image2,
          imageWidth,
          imageHeight,
          splitDirection,
          splitRatio,
        });

        if (matches.length === 0) {
          setAutoBlurEmailsStatus('No email addresses detected.');
          return;
        }

        const nextStrokes = createEmailBlurStrokes({
          boxes: matches.map((match) => match.box),
          imageWidth,
          imageHeight,
          blurType,
          strength: brushStrength,
          radius: brushRadius,
        });

        if (!appendBlurStrokes(nextStrokes, {commitHistory: true})) {
          setAutoBlurEmailsStatus('No email addresses detected.');
          return;
        }

        setShowBlurOutlines(true);
        setAutoBlurEmailsStatus(
          `Blurred ${matches.length} detected email${matches.length === 1 ? '' : 's'}.`,
        );
      } catch (error) {
        const message =
          error instanceof Error && error.message ? error.message : 'Unknown OCR error.';
        setAutoBlurEmailsStatus(`Automatic email detection failed: ${message}`);
      } finally {
        setIsAutoBlurEmailsPending(false);
      }
    })();
  }, [
    appendBlurStrokes,
    blurType,
    brushRadius,
    brushStrength,
    image1,
    image2,
    imageHeight,
    imageWidth,
    isAutoBlurEmailsPending,
    splitDirection,
    splitRatio,
  ]);

  useEffect(() => {
    if (!isSelectToolWithSelection) {
      pendingSelectedStrengthHistoryRef.current = false;
    }
  }, [isSelectToolWithSelection]);

  useEffect(() => {
    setAutoBlurEmailsStatus(undefined);
  }, [image1, image2, imageHeight, imageWidth, splitDirection, splitRatio]);

  return (
    <aside
      className="border-border flex h-full w-72 flex-shrink-0 flex-col overflow-y-auto border-r-2"
      style={{background: 'oklch(var(--sidebar-background))'}}>
      <ToolSection
        activeTool={activeTool}
        switchToolTooltip={switchToolTooltip}
        onSetActiveTool={setActiveTool}
      />

      <BlurSettingsSection
        modeTooltip={modeTooltip}
        blurTypeTooltip={blurTypeTooltip}
        outlinesTooltip={outlinesTooltip}
        radiusTooltip={radiusTooltip}
        strengthTooltip={strengthTooltip}
        outlinesTogglePressed={outlinesTogglePressed}
        outlinesForcedOn={outlinesForcedOn}
        showBlurOutlines={showBlurOutlines}
        canEditBlurMode={canEditBlurMode}
        canEditBlurType={canEditBlurType}
        canEditStrength={canEditStrength}
        canEditRadius={canEditRadius}
        blurStrokeShape={effectiveBlurStrokeShape}
        displayedBlurType={displayedBlurType}
        displayedStrength={displayedStrength}
        brushRadius={brushRadius}
        onBlurStrokeShapeChange={setBlurStrokeShape}
        onToggleOutlines={() => setShowBlurOutlines(!showBlurOutlines)}
        onClearBlurStrokes={clearBlurStrokes}
        onBlurTypeChange={handleBlurTypeChange}
        onStrengthChange={handleStrengthChange}
        onStrengthCommit={handleStrengthCommit}
        onRadiusChange={setBrushRadius}
        onAutoBlurEmails={handleAutoBlurEmails}
        isAutoBlurEmailsPending={isAutoBlurEmailsPending}
        autoBlurEmailsDisabled={autoBlurEmailsDisabled}
        autoBlurEmailsTooltip={autoBlurEmailsTooltip}
        autoBlurEmailsStatus={autoBlurEmailsStatus}
      />
      <BlurTemplatePanel />

      <ShortcutsSection
        shortcutsTooltip={shortcutsTooltip}
        onOpenShortcutsModal={openShortcutsModal}
      />
    </aside>
  );
}
