import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {createEmailBlurStrokes} from '@/features/editor/lib/email-blur-strokes';
import {RESET_AUTO_BLUR_SETTINGS_EVENT} from '@/features/editor/lib/events';
import {formatShortcutTooltip} from '@/features/editor/lib/shortcut-definitions';
import {
  detectCustomTextInImage,
  detectEmailsInImage,
  detectPhoneNumbersInImage,
  type DetectedTextMatch,
} from '@/features/editor/services/ocr-text-detection';
import {
  loadAutoBlurDefaults,
  normalizeAutoBlurDefaultCustomEntry,
  saveAutoBlurDefaults,
  type AutoBlurDefaults,
} from '@/features/editor/state/auto-blur-defaults-storage';
import {
  loadAutoBlurCustomTexts,
  saveAutoBlurCustomTexts,
} from '@/features/editor/state/auto-blur-custom-text-storage';
import type {BlurType} from '@/features/editor/state/types';
import {useEditorStore} from '@/features/editor/state/use-editor-store';
import {BlurTemplatePanel} from './blur-template-panel';
import {BlurSettingsSection} from './editor-sidebar/blur-settings-section';
import {ShortcutsSection} from './editor-sidebar/shortcuts-section';
import {ToolSection} from './editor-sidebar/tool-section';

interface EditorSidebarProps {
  selectedStrokeIndices: number[];
}

function normalizeSavedCustomText(value: string): string {
  return value.trim().toLowerCase();
}

function upsertSavedCustomText(existing: string[], nextText: string): string[] {
  const trimmed = nextText.trim();
  if (!trimmed) return existing;

  const normalized = normalizeSavedCustomText(trimmed);
  const alreadyExists = existing.some((entry) => normalizeSavedCustomText(entry) === normalized);
  if (alreadyExists) return existing;

  return [trimmed, ...existing];
}

export function EditorSidebar({selectedStrokeIndices}: EditorSidebarProps) {
  const pendingSelectedStrengthHistoryRef = useRef(false);
  const autoBlurAppliedDocumentRef = useRef<string | null>(null);
  const autoBlurDefaultInFlightRef = useRef(false);
  const [isAutoBlurPending, setIsAutoBlurPending] = useState(false);
  const [autoBlurStatus, setAutoBlurStatus] = useState<string | undefined>(undefined);
  const [autoBlurDefaults, setAutoBlurDefaults] = useState<AutoBlurDefaults>(() =>
    loadAutoBlurDefaults(),
  );
  const [savedAutoBlurCustomTexts, setSavedAutoBlurCustomTexts] = useState<string[]>(() =>
    loadAutoBlurCustomTexts(),
  );

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
  const defaultCustomAutoBlurEntries = useMemo(
    () => new Set(autoBlurDefaults.customEntries),
    [autoBlurDefaults.customEntries],
  );
  const enabledDefaultAutoBlurCustomTexts = useMemo(
    () =>
      savedAutoBlurCustomTexts.filter((entry) =>
        defaultCustomAutoBlurEntries.has(normalizeAutoBlurDefaultCustomEntry(entry)),
      ),
    [defaultCustomAutoBlurEntries, savedAutoBlurCustomTexts],
  );

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
  const canAutoBlur = Boolean(image1) && imageWidth > 0 && imageHeight > 0;
  const autoBlurDisabled = !canAutoBlur || activeTool !== 'blur' || isAutoBlurPending;

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

  const appendDetectedBlurStrokes = useCallback(
    (
      matches: DetectedTextMatch[],
      noMatchMessage: string,
      successMessage: (count: number) => string,
    ) => {
      if (matches.length === 0) {
        setAutoBlurStatus(noMatchMessage);
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
        setAutoBlurStatus(noMatchMessage);
        return;
      }

      setShowBlurOutlines(true);
      setAutoBlurStatus(successMessage(matches.length));
    },
    [
      appendBlurStrokes,
      blurType,
      brushRadius,
      brushStrength,
      imageHeight,
      imageWidth,
      setShowBlurOutlines,
    ],
  );

  const runAutoBlurDetection = useCallback(
    (
      detect: () => Promise<DetectedTextMatch[]>,
      noMatchMessage: string,
      successMessage: (count: number) => string,
    ) => {
      if (!image1 || imageWidth <= 0 || imageHeight <= 0 || isAutoBlurPending) return;

      setIsAutoBlurPending(true);
      setAutoBlurStatus(undefined);

      void (async () => {
        try {
          const matches = await detect();
          appendDetectedBlurStrokes(matches, noMatchMessage, successMessage);
        } catch (error) {
          const message =
            error instanceof Error && error.message ? error.message : 'Unknown OCR error.';
          setAutoBlurStatus(`Automatic detection failed: ${message}`);
        } finally {
          setIsAutoBlurPending(false);
        }
      })();
    },
    [appendDetectedBlurStrokes, image1, imageHeight, imageWidth, isAutoBlurPending],
  );

  const updateAutoBlurDefaults = useCallback(
    (updater: (previous: AutoBlurDefaults) => AutoBlurDefaults) => {
      setAutoBlurDefaults((previous) => {
        const next = updater(previous);
        saveAutoBlurDefaults(next);
        return next;
      });
    },
    [],
  );

  const handleAutoBlurEmails = useCallback(() => {
    runAutoBlurDetection(
      () =>
        detectEmailsInImage({
          image1,
          image2,
          imageWidth,
          imageHeight,
          splitDirection,
          splitRatio,
        }),
      'No email addresses detected.',
      (count) => `Blurred ${count} detected email${count === 1 ? '' : 's'}.`,
    );
  }, [image1, image2, imageHeight, imageWidth, runAutoBlurDetection, splitDirection, splitRatio]);

  const handleAutoBlurPhoneNumbers = useCallback(() => {
    runAutoBlurDetection(
      () =>
        detectPhoneNumbersInImage({
          image1,
          image2,
          imageWidth,
          imageHeight,
          splitDirection,
          splitRatio,
        }),
      'No phone numbers detected.',
      (count) => `Blurred ${count} detected phone number${count === 1 ? '' : 's'}.`,
    );
  }, [image1, image2, imageHeight, imageWidth, runAutoBlurDetection, splitDirection, splitRatio]);

  const persistCustomText = useCallback((nextText: string) => {
    setSavedAutoBlurCustomTexts((previous) => {
      const next = upsertSavedCustomText(previous, nextText);
      saveAutoBlurCustomTexts(next);
      return next;
    });
  }, []);

  const handleAutoBlurCustomText = useCallback(
    (query: string) => {
      const trimmedQuery = query.trim();
      if (!trimmedQuery) return;

      persistCustomText(trimmedQuery);

      runAutoBlurDetection(
        () =>
          detectCustomTextInImage({
            image1,
            image2,
            imageWidth,
            imageHeight,
            splitDirection,
            splitRatio,
            query: trimmedQuery,
          }),
        `No matches found for "${trimmedQuery}".`,
        (count) => `Blurred ${count} match${count === 1 ? '' : 'es'} for "${trimmedQuery}".`,
      );
    },
    [
      image1,
      image2,
      imageHeight,
      imageWidth,
      persistCustomText,
      runAutoBlurDetection,
      splitDirection,
      splitRatio,
    ],
  );

  const handleDeleteAutoBlurCustomText = useCallback(
    (text: string) => {
      const normalized = normalizeSavedCustomText(text);

      setSavedAutoBlurCustomTexts((previous) => {
        const next = previous.filter((entry) => normalizeSavedCustomText(entry) !== normalized);
        saveAutoBlurCustomTexts(next);
        return next;
      });
      updateAutoBlurDefaults((previous) => ({
        ...previous,
        customEntries: previous.customEntries.filter((entry) => entry !== normalized),
      }));
    },
    [updateAutoBlurDefaults],
  );

  const toggleAutoBlurEmailDefault = useCallback(() => {
    updateAutoBlurDefaults((previous) => ({...previous, email: !previous.email}));
  }, [updateAutoBlurDefaults]);

  const toggleAutoBlurPhoneDefault = useCallback(() => {
    updateAutoBlurDefaults((previous) => ({...previous, phone: !previous.phone}));
  }, [updateAutoBlurDefaults]);

  const toggleAutoBlurCustomTextDefault = useCallback(
    (text: string) => {
      const normalized = normalizeAutoBlurDefaultCustomEntry(text);
      if (!normalized) return;

      updateAutoBlurDefaults((previous) => {
        const hasEntry = previous.customEntries.includes(normalized);
        return {
          ...previous,
          customEntries: hasEntry
            ? previous.customEntries.filter((entry) => entry !== normalized)
            : [...previous.customEntries, normalized],
        };
      });
    },
    [updateAutoBlurDefaults],
  );

  const isAutoBlurCustomTextDefaultEnabled = useCallback(
    (text: string) => defaultCustomAutoBlurEntries.has(normalizeAutoBlurDefaultCustomEntry(text)),
    [defaultCustomAutoBlurEntries],
  );

  useEffect(() => {
    if (!isSelectToolWithSelection) {
      pendingSelectedStrengthHistoryRef.current = false;
    }
  }, [isSelectToolWithSelection]);

  useEffect(() => {
    setAutoBlurStatus(undefined);
  }, [image1, image2, imageHeight, imageWidth, splitDirection, splitRatio]);

  useEffect(() => {
    const handleResetAutoBlurSettings = () => {
      setAutoBlurDefaults(loadAutoBlurDefaults());
      setSavedAutoBlurCustomTexts(loadAutoBlurCustomTexts());
      setAutoBlurStatus(undefined);
      autoBlurAppliedDocumentRef.current = null;
    };

    window.addEventListener(RESET_AUTO_BLUR_SETTINGS_EVENT, handleResetAutoBlurSettings);
    return () => {
      window.removeEventListener(RESET_AUTO_BLUR_SETTINGS_EVENT, handleResetAutoBlurSettings);
    };
  }, []);

  useEffect(() => {
    if (image1 && imageWidth > 0 && imageHeight > 0) return;
    autoBlurAppliedDocumentRef.current = null;
    autoBlurDefaultInFlightRef.current = false;
  }, [image1, imageHeight, imageWidth]);

  useEffect(() => {
    if (!image1 || imageWidth <= 0 || imageHeight <= 0) return;
    if (historyIndex !== 0) return;
    if (isAutoBlurPending || autoBlurDefaultInFlightRef.current) return;

    const defaultRulesEnabled =
      autoBlurDefaults.email ||
      autoBlurDefaults.phone ||
      enabledDefaultAutoBlurCustomTexts.length > 0;
    if (!defaultRulesEnabled) return;

    const documentKey = `${image1}|${image2 ?? ''}|${imageWidth}x${imageHeight}`;
    if (autoBlurAppliedDocumentRef.current === documentKey) return;

    autoBlurAppliedDocumentRef.current = documentKey;
    autoBlurDefaultInFlightRef.current = true;
    setIsAutoBlurPending(true);
    setAutoBlurStatus(undefined);

    void (async () => {
      const allMatches: DetectedTextMatch[] = [];
      const failedRules: string[] = [];

      const detectionOptions = {
        image1,
        image2,
        imageWidth,
        imageHeight,
        splitDirection,
        splitRatio,
      };

      try {
        if (autoBlurDefaults.email) {
          try {
            allMatches.push(...(await detectEmailsInImage(detectionOptions)));
          } catch {
            failedRules.push('email');
          }
        }

        if (autoBlurDefaults.phone) {
          try {
            allMatches.push(...(await detectPhoneNumbersInImage(detectionOptions)));
          } catch {
            failedRules.push('phone');
          }
        }

        for (const query of enabledDefaultAutoBlurCustomTexts) {
          try {
            allMatches.push(...(await detectCustomTextInImage({...detectionOptions, query})));
          } catch {
            failedRules.push(`custom "${query}"`);
          }
        }

        if (allMatches.length > 0) {
          const nextStrokes = createEmailBlurStrokes({
            boxes: allMatches.map((match) => match.box),
            imageWidth,
            imageHeight,
            blurType,
            strength: brushStrength,
            radius: brushRadius,
          });
          const appended = appendBlurStrokes(nextStrokes, {commitHistory: true});
          if (appended) {
            setShowBlurOutlines(true);
          }
        }

        const summary =
          allMatches.length > 0
            ? `Auto blur on load: blurred ${allMatches.length} match${allMatches.length === 1 ? '' : 'es'}.`
            : 'Auto blur on load: no matches detected.';
        const failureSuffix =
          failedRules.length > 0 ? ` Failed rules: ${failedRules.join(', ')}.` : '';
        setAutoBlurStatus(`${summary}${failureSuffix}`);
      } finally {
        autoBlurDefaultInFlightRef.current = false;
        setIsAutoBlurPending(false);
      }
    })();
  }, [
    appendBlurStrokes,
    autoBlurDefaults.email,
    autoBlurDefaults.phone,
    blurType,
    brushRadius,
    brushStrength,
    enabledDefaultAutoBlurCustomTexts,
    historyIndex,
    image1,
    image2,
    imageHeight,
    imageWidth,
    isAutoBlurPending,
    setShowBlurOutlines,
    splitDirection,
    splitRatio,
  ]);

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
        onAutoBlurPhoneNumbers={handleAutoBlurPhoneNumbers}
        onAutoBlurCustomText={handleAutoBlurCustomText}
        onDeleteAutoBlurCustomText={handleDeleteAutoBlurCustomText}
        autoBlurStrength={brushStrength}
        onAutoBlurStrengthChange={setBrushStrength}
        autoBlurApplyOnLoadEmail={autoBlurDefaults.email}
        autoBlurApplyOnLoadPhone={autoBlurDefaults.phone}
        isAutoBlurApplyOnLoadCustomText={isAutoBlurCustomTextDefaultEnabled}
        onToggleAutoBlurApplyOnLoadEmail={toggleAutoBlurEmailDefault}
        onToggleAutoBlurApplyOnLoadPhone={toggleAutoBlurPhoneDefault}
        onToggleAutoBlurApplyOnLoadCustomText={toggleAutoBlurCustomTextDefault}
        savedAutoBlurCustomTexts={savedAutoBlurCustomTexts}
        isAutoBlurPending={isAutoBlurPending}
        autoBlurDisabled={autoBlurDisabled}
        autoBlurTooltip={autoBlurTooltip}
        autoBlurStatus={autoBlurStatus}
      />
      <BlurTemplatePanel />

      <ShortcutsSection
        shortcutsTooltip={shortcutsTooltip}
        onOpenShortcutsModal={openShortcutsModal}
      />
    </aside>
  );
}
