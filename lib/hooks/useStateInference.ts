'use client';

/**
 * useStateInference Hook
 *
 * React hook for inferring user state based on task behavior.
 * Uses stateInferenceService to analyze patterns and provide
 * state-aware AI suggestions.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  inferUserState,
  isStateValid,
  getStateDescription,
} from '@/lib/services/stateInferenceService';
import type { InferredUserState, InferredStateType, TaskWithDetails } from '@/types';

/**
 * Simplified state group for nudge selection
 * Maps detailed states to broader categories used in task-nudges.md
 */
export type SimplifiedStateGroup = 'S_low_energy' | 'S_avoidant' | 'S_neutral_or_up';

interface UseStateInferenceReturn {
  /** Current inferred state */
  inferredState: InferredUserState | null;
  /** Simplified state group for nudge selection */
  stateGroup: SimplifiedStateGroup;
  /** Human-readable state description */
  stateDescription: string;
  /** Whether the inference is still valid */
  isValid: boolean;
  /** Whether currently inferring */
  isInferring: boolean;
  /** Manually trigger re-inference */
  refresh: () => void;
}

/**
 * Map detailed state to simplified group
 * Based on task-nudges.md section 1.4
 */
function getSimplifiedStateGroup(state: InferredStateType): SimplifiedStateGroup {
  switch (state) {
    case 'low':
    case 'tired':
      return 'S_low_energy';
    case 'avoidant':
    case 'needs_breakdown':
      return 'S_avoidant';
    case 'energized':
    case 'okay':
    case 'uncertain':
    case 'disengaged':
    default:
      return 'S_neutral_or_up';
  }
}

/**
 * Hook for inferring user state from task data
 *
 * @param tasks - Array of tasks with details to analyze
 * @param autoRefreshInterval - Auto-refresh interval in ms (default: 5 minutes, 0 to disable)
 */
export function useStateInference(
  tasks: TaskWithDetails[],
  autoRefreshInterval: number = 5 * 60 * 1000
): UseStateInferenceReturn {
  const [inferredState, setInferredState] = useState<InferredUserState | null>(null);
  const [isInferring, setIsInferring] = useState(false);

  // Perform inference
  const performInference = useCallback(() => {
    if (tasks.length === 0) {
      setInferredState(null);
      return;
    }

    setIsInferring(true);

    // Inference is synchronous but we simulate async for future-proofing
    try {
      const newState = inferUserState(tasks);
      setInferredState(newState);
    } catch (error) {
      console.error('[useStateInference] Inference failed:', error);
      // Keep previous state on error
    } finally {
      setIsInferring(false);
    }
  }, [tasks]);

  // Initial inference and when tasks change significantly
  useEffect(() => {
    // Only re-infer if we don't have a valid state
    if (!inferredState || !isStateValid(inferredState)) {
      performInference();
    }
  }, [inferredState, performInference]);

  // Re-infer when task count changes significantly (task added/completed)
  const taskCount = tasks.length;
  const completedCount = tasks.filter(t => t.completed).length;
  useEffect(() => {
    // Debounced re-inference on task changes
    const timer = setTimeout(() => {
      performInference();
    }, 1000); // Wait 1s after task changes

    return () => clearTimeout(timer);
  }, [taskCount, completedCount, performInference]);

  // Auto-refresh interval
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;

    const interval = setInterval(() => {
      performInference();
    }, autoRefreshInterval);

    return () => clearInterval(interval);
  }, [autoRefreshInterval, performInference]);

  // Computed values
  const isValid = inferredState ? isStateValid(inferredState) : false;

  const stateGroup = useMemo(() => {
    if (!inferredState) return 'S_neutral_or_up';
    return getSimplifiedStateGroup(inferredState.state);
  }, [inferredState]);

  const stateDescription = useMemo(() => {
    if (!inferredState) return '';
    return getStateDescription(inferredState.state);
  }, [inferredState]);

  return {
    inferredState,
    stateGroup,
    stateDescription,
    isValid,
    isInferring,
    refresh: performInference,
  };
}
