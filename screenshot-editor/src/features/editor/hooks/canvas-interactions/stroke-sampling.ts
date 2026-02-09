import {useCallback, useEffect, useRef} from 'react';
import type {Point} from '@/features/editor/state/types';
import {useEditorStore} from '@/features/editor/state/use-editor-store';
import {
  DIRECTION_CHANGE_DOT_THRESHOLD,
  getAdaptiveSamplingDistance,
  getSamplingPerfStats,
} from './constants';

export function useStrokeSampling() {
  const pendingStrokePointsRef = useRef<Point[]>([]);
  const strokeFrameRef = useRef<number>(0);
  const lastAcceptedPointRef = useRef<Point | null>(null);
  const lastAcceptedVectorRef = useRef<Point | null>(null);

  const resetStrokeQueue = useCallback(() => {
    if (strokeFrameRef.current) {
      cancelAnimationFrame(strokeFrameRef.current);
      strokeFrameRef.current = 0;
    }

    pendingStrokePointsRef.current = [];
  }, []);

  const flushPendingStrokePoints = useCallback(() => {
    if (pendingStrokePointsRef.current.length === 0) return;

    const pendingPoints = pendingStrokePointsRef.current;
    pendingStrokePointsRef.current = [];
    useEditorStore.getState().appendStrokePoints(pendingPoints);
  }, []);

  const scheduleStrokeFlush = useCallback(() => {
    if (strokeFrameRef.current) return;

    strokeFrameRef.current = requestAnimationFrame(() => {
      strokeFrameRef.current = 0;
      flushPendingStrokePoints();
    });
  }, [flushPendingStrokePoints]);

  const queueStrokePoint = useCallback(
    (x: number, y: number, options?: {force: boolean}) => {
      const force = options?.force ?? false;
      const nextPoint = {x, y};
      const previous = lastAcceptedPointRef.current;
      const perfStats = getSamplingPerfStats();

      if (!previous) {
        lastAcceptedPointRef.current = nextPoint;
        pendingStrokePointsRef.current.push(nextPoint);
        scheduleStrokeFlush();
        if (perfStats) {
          perfStats.acceptedPoints += 1;
        }
        return;
      }

      const dx = nextPoint.x - previous.x;
      const dy = nextPoint.y - previous.y;
      const dist = Math.hypot(dx, dy);

      if (dist === 0) {
        if (perfStats) {
          perfStats.skippedPoints += 1;
        }
        return;
      }

      const {brushRadius, zoom} = useEditorStore.getState();
      const minDistance = getAdaptiveSamplingDistance(brushRadius, zoom);

      let shouldAppend = force || dist >= minDistance;

      if (!shouldAppend && dist > 0) {
        const previousVector = lastAcceptedVectorRef.current;
        if (previousVector && dist >= minDistance * 0.5) {
          const nx = dx / dist;
          const ny = dy / dist;
          const prevLen = Math.hypot(previousVector.x, previousVector.y);
          if (prevLen > 0) {
            const pvx = previousVector.x / prevLen;
            const pvy = previousVector.y / prevLen;
            const dot = nx * pvx + ny * pvy;
            shouldAppend = dot < DIRECTION_CHANGE_DOT_THRESHOLD;
          }
        }
      }

      if (!shouldAppend) {
        if (perfStats) {
          perfStats.skippedPoints += 1;
        }
        return;
      }

      pendingStrokePointsRef.current.push(nextPoint);
      lastAcceptedPointRef.current = nextPoint;
      lastAcceptedVectorRef.current = {x: dx, y: dy};
      scheduleStrokeFlush();

      if (perfStats) {
        perfStats.acceptedPoints += 1;
      }
    },
    [scheduleStrokeFlush],
  );

  const finishActiveStroke = useCallback(
    (finalPoint?: Point) => {
      const store = useEditorStore.getState();
      if (!store.isDrawing || !store.currentStroke) return;
      const strokeShape = store.currentStroke.shape ?? 'brush';

      if (strokeShape === 'box') {
        if (finalPoint) {
          store.setCurrentStrokeEndpoint(finalPoint.x, finalPoint.y);
        }
        store.finishStroke();
        resetStrokeQueue();
        lastAcceptedPointRef.current = null;
        lastAcceptedVectorRef.current = null;
        return;
      }

      if (finalPoint) {
        queueStrokePoint(finalPoint.x, finalPoint.y, {force: true});
      }

      flushPendingStrokePoints();
      store.finishStroke();

      resetStrokeQueue();
      lastAcceptedPointRef.current = null;
      lastAcceptedVectorRef.current = null;
    },
    [flushPendingStrokePoints, queueStrokePoint, resetStrokeQueue],
  );

  const startStrokeSampling = useCallback(
    (startPoint: Point, shape: 'brush' | 'box') => {
      resetStrokeQueue();
      lastAcceptedPointRef.current = shape === 'brush' ? startPoint : null;
      lastAcceptedVectorRef.current = null;
    },
    [resetStrokeQueue],
  );

  useEffect(() => {
    return () => {
      if (strokeFrameRef.current) {
        cancelAnimationFrame(strokeFrameRef.current);
      }
    };
  }, []);

  return {
    queueStrokePoint,
    finishActiveStroke,
    startStrokeSampling,
  };
}
