import {useCallback, useEffect, useMemo, useRef} from 'react';
import type {ChangeEvent} from 'react';
import {isOpenUploadShortcut, isTypingElement} from '@/features/editor/lib/keyboard';
import {formatShortcutTooltip} from '@/features/editor/lib/shortcut-definitions';
import type {BlurType} from '@/features/editor/state/types';
import {useEditorStore} from '@/features/editor/state/use-editor-store';
import {BlurSettingsSection} from './editor-sidebar/blur-settings-section';
import {ShortcutsSection} from './editor-sidebar/shortcuts-section';
import {SplitViewSection} from './editor-sidebar/split-view-section';
import {ToolSection} from './editor-sidebar/tool-section';

interface EditorSidebarProps {
  onAddSecondImage: (dataUrl: string, fileName: string | null) => void;
  selectedStrokeIndices: number[];
}

export function EditorSidebar({onAddSecondImage, selectedStrokeIndices}: EditorSidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingSelectedStrengthHistoryRef = useRef(false);

  const image2 = useEditorStore((state) => state.image2);
  const activeTool = useEditorStore((state) => state.activeTool);
  const blurType = useEditorStore((state) => state.blurType);
  const brushRadius = useEditorStore((state) => state.brushRadius);
  const brushStrength = useEditorStore((state) => state.brushStrength);
  const isShiftPressed = useEditorStore((state) => state.isShiftPressed);
  const blurStrokes = useEditorStore((state) => state.blurStrokes);
  const splitRatio = useEditorStore((state) => state.splitRatio);
  const splitDirection = useEditorStore((state) => state.splitDirection);
  const lightImageSide = useEditorStore((state) => state.lightImageSide);
  const showBlurOutlines = useEditorStore((state) => state.showBlurOutlines);

  const setActiveTool = useEditorStore((state) => state.setActiveTool);
  const setBlurType = useEditorStore((state) => state.setBlurType);
  const setBrushRadius = useEditorStore((state) => state.setBrushRadius);
  const setBrushStrength = useEditorStore((state) => state.setBrushStrength);
  const updateBlurStrokesAtIndices = useEditorStore((state) => state.updateBlurStrokesAtIndices);
  const pushHistorySnapshot = useEditorStore((state) => state.pushHistorySnapshot);
  const setSplitRatio = useEditorStore((state) => state.setSplitRatio);
  const setSplitDirection = useEditorStore((state) => state.setSplitDirection);
  const setLightImageSide = useEditorStore((state) => state.setLightImageSide);
  const removeSecondImage = useEditorStore((state) => state.removeSecondImage);
  const clearBlurStrokes = useEditorStore((state) => state.clearBlurStrokes);
  const setShowBlurOutlines = useEditorStore((state) => state.setShowBlurOutlines);
  const openShortcutsModal = useEditorStore((state) => state.openShortcutsModal);

  const handleFileSelect = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        onAddSecondImage(loadEvent.target?.result as string, file.name);
      };
      reader.readAsDataURL(file);
      event.target.value = '';
    },
    [onAddSecondImage],
  );

  const switchToolTooltip = formatShortcutTooltip('Switch tool', ['switch-tool']);
  const blurTypeTooltip = formatShortcutTooltip('Toggle blur type', ['toggle-blur-type']);
  const outlinesTooltip = formatShortcutTooltip('Toggle outlines', ['toggle-outlines']);
  const radiusTooltip = formatShortcutTooltip('Radius +/-', ['radius-step']);
  const strengthTooltip = formatShortcutTooltip('Strength +/-', ['strength-step']);
  const directionTooltip = formatShortcutTooltip('Cycle direction', ['cycle-split-direction']);
  const placementTooltip = formatShortcutTooltip('Cycle placement', ['toggle-split-placement']);
  const shortcutsTooltip = formatShortcutTooltip('Shortcuts', ['shortcuts-modal']);
  const uploadDialogTooltip = formatShortcutTooltip('Open file dialog', ['open-upload-dialog']);

  const validSelectedStrokeIndices = useMemo(() => {
    const unique = [...new Set(selectedStrokeIndices)];
    return unique
      .filter((index) => Number.isInteger(index))
      .filter((index) => index >= 0 && index < blurStrokes.length);
  }, [blurStrokes.length, selectedStrokeIndices]);

  const isSelectToolWithSelection =
    activeTool === 'select' && validSelectedStrokeIndices.length > 0;
  const canEditBlurType = activeTool === 'blur' || isSelectToolWithSelection;
  const canEditStrength = activeTool === 'blur' || isSelectToolWithSelection;
  const canEditRadius = activeTool === 'blur' && !isShiftPressed;
  const outlinesForcedOn = activeTool === 'select';
  const outlinesTogglePressed = outlinesForcedOn || showBlurOutlines;
  const selectedSourceStroke = isSelectToolWithSelection
    ? (blurStrokes[validSelectedStrokeIndices[0]] ?? null)
    : null;
  const displayedBlurType = selectedSourceStroke?.blurType ?? blurType;
  const displayedStrength = selectedSourceStroke?.strength ?? brushStrength;

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
    if (image2) return;

    const handleShortcut = (event: KeyboardEvent) => {
      if (!isOpenUploadShortcut(event)) return;
      if (isTypingElement(event.target) || isTypingElement(document.activeElement)) return;

      event.preventDefault();
      fileInputRef.current?.click();
    };

    window.addEventListener('keydown', handleShortcut, true);
    return () => window.removeEventListener('keydown', handleShortcut, true);
  }, [image2]);

  useEffect(() => {
    if (!isSelectToolWithSelection) {
      pendingSelectedStrengthHistoryRef.current = false;
    }
  }, [isSelectToolWithSelection]);

  return (
    <aside
      className="border-border flex h-full w-64 flex-shrink-0 flex-col overflow-y-auto border-r-2"
      style={{background: 'oklch(var(--sidebar-background))'}}>
      <ToolSection
        activeTool={activeTool}
        switchToolTooltip={switchToolTooltip}
        onSetActiveTool={setActiveTool}
      />

      <BlurSettingsSection
        blurTypeTooltip={blurTypeTooltip}
        outlinesTooltip={outlinesTooltip}
        radiusTooltip={radiusTooltip}
        strengthTooltip={strengthTooltip}
        outlinesTogglePressed={outlinesTogglePressed}
        outlinesForcedOn={outlinesForcedOn}
        showBlurOutlines={showBlurOutlines}
        canEditBlurType={canEditBlurType}
        canEditStrength={canEditStrength}
        canEditRadius={canEditRadius}
        displayedBlurType={displayedBlurType}
        displayedStrength={displayedStrength}
        brushRadius={brushRadius}
        onToggleOutlines={() => setShowBlurOutlines(!showBlurOutlines)}
        onClearBlurStrokes={clearBlurStrokes}
        onBlurTypeChange={handleBlurTypeChange}
        onStrengthChange={handleStrengthChange}
        onStrengthCommit={handleStrengthCommit}
        onRadiusChange={setBrushRadius}
      />

      <SplitViewSection
        image2={image2}
        splitDirection={splitDirection}
        splitRatio={splitRatio}
        lightImageSide={lightImageSide}
        uploadDialogTooltip={uploadDialogTooltip}
        directionTooltip={directionTooltip}
        placementTooltip={placementTooltip}
        fileInputRef={fileInputRef}
        onSetSplitDirection={(dir) => setSplitDirection(dir, {commitHistory: true})}
        onSetSplitRatio={(value) => setSplitRatio(value, {debouncedHistory: true})}
        onSetLightImageSide={(side) => setLightImageSide(side, {reorderImages: true})}
        onRemoveSecondImage={removeSecondImage}
      />

      <ShortcutsSection
        shortcutsTooltip={shortcutsTooltip}
        onOpenShortcutsModal={openShortcutsModal}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </aside>
  );
}
