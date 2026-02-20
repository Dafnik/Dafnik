import {useCallback, useEffect, useMemo, useRef} from 'react';
import {formatShortcutTooltip} from '@/features/editor/lib/shortcut-definitions';
import {useAutoBlurController} from '@/features/editor/hooks/use-auto-blur-controller';
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
  const historyIndex = useEditorStore((state) => state.historyIndex);

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
  const autoBlurTooltip = formatShortcutTooltip('Auto blur text patterns', ['open-auto-blur-menu']);

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

  const autoBlur = useAutoBlurController({
    image1,
    image2,
    imageWidth,
    imageHeight,
    splitDirection,
    splitRatio,
    blurType,
    brushStrength,
    brushRadius,
    historyIndex,
    appendBlurStrokes,
    setShowBlurOutlines,
  });
  const autoBlurDisabled =
    !autoBlur.canAutoBlur || activeTool !== 'blur' || autoBlur.isAutoBlurPending;

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

  useEffect(() => {
    if (!isSelectToolWithSelection) {
      pendingSelectedStrengthHistoryRef.current = false;
    }
  }, [isSelectToolWithSelection]);

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
        onAutoBlurEmails={autoBlur.handleAutoBlurEmails}
        onAutoBlurPhoneNumbers={autoBlur.handleAutoBlurPhoneNumbers}
        onAutoBlurCustomText={autoBlur.handleAutoBlurCustomText}
        onDeleteAutoBlurCustomText={autoBlur.handleDeleteAutoBlurCustomText}
        autoBlurStrength={brushStrength}
        onAutoBlurStrengthChange={setBrushStrength}
        autoBlurApplyOnLoadEmail={autoBlur.autoBlurDefaults.email}
        autoBlurApplyOnLoadPhone={autoBlur.autoBlurDefaults.phone}
        isAutoBlurApplyOnLoadCustomText={autoBlur.isAutoBlurCustomTextDefaultEnabled}
        onToggleAutoBlurApplyOnLoadEmail={autoBlur.toggleAutoBlurEmailDefault}
        onToggleAutoBlurApplyOnLoadPhone={autoBlur.toggleAutoBlurPhoneDefault}
        onToggleAutoBlurApplyOnLoadCustomText={autoBlur.toggleAutoBlurCustomTextDefault}
        savedAutoBlurCustomTexts={autoBlur.savedAutoBlurCustomTexts}
        isAutoBlurPending={autoBlur.isAutoBlurPending}
        autoBlurDisabled={autoBlurDisabled}
        autoBlurTooltip={autoBlurTooltip}
        autoBlurStatus={autoBlur.autoBlurStatus}
      />
      <BlurTemplatePanel />

      <ShortcutsSection
        shortcutsTooltip={shortcutsTooltip}
        onOpenShortcutsModal={openShortcutsModal}
      />
    </aside>
  );
}
