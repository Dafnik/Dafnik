import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {createEmailBlurStrokes} from '@/features/editor/lib/email-blur-strokes';
import {RESET_AUTO_BLUR_SETTINGS_EVENT} from '@/features/editor/lib/events';
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
import type {BlurType, SplitDirection} from '@/features/editor/state/types';

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

interface UseAutoBlurControllerOptions {
  image1: string | null;
  image2: string | null;
  imageWidth: number;
  imageHeight: number;
  splitDirection: SplitDirection;
  splitRatio: number;
  blurType: BlurType;
  brushStrength: number;
  brushRadius: number;
  historyIndex: number;
  appendBlurStrokes: (
    strokes: Array<{
      points: {x: number; y: number}[];
      radius: number;
      strength: number;
      blurType: BlurType;
      shape?: 'brush' | 'box';
    }>,
    options?: {commitHistory?: boolean},
  ) => boolean;
  setShowBlurOutlines: (visible: boolean) => void;
}

export function useAutoBlurController({
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
}: UseAutoBlurControllerOptions) {
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
    return () =>
      window.removeEventListener(RESET_AUTO_BLUR_SETTINGS_EVENT, handleResetAutoBlurSettings);
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

  return {
    isAutoBlurPending,
    autoBlurStatus,
    autoBlurDefaults,
    savedAutoBlurCustomTexts,
    handleAutoBlurEmails,
    handleAutoBlurPhoneNumbers,
    handleAutoBlurCustomText,
    handleDeleteAutoBlurCustomText,
    toggleAutoBlurEmailDefault,
    toggleAutoBlurPhoneDefault,
    toggleAutoBlurCustomTextDefault,
    isAutoBlurCustomTextDefaultEnabled,
    canAutoBlur: Boolean(image1) && imageWidth > 0 && imageHeight > 0,
  };
}
