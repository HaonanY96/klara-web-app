'use client';

/**
 * useUserPreferences Hook
 * 
 * React hook for managing user preferences with IndexedDB persistence.
 * Provides preferences operations with automatic state sync.
 */

import { useState, useEffect, useCallback } from 'react';
import { userPreferencesRepository } from '@/lib/db/repositories';
import type { 
  UserPreferences, 
  ToneStyle, 
  CreateAIFeedback,
  InferredUserState,
  FeedbackReaction,
  InferredStateType,
} from '@/types';

interface UseUserPreferencesReturn {
  // Data
  preferences: UserPreferences | null;
  toneStyle: ToneStyle;
  hasSeenReflectionIntro: boolean;
  tasksCompletedCount: number;
  
  // State
  isLoading: boolean;
  error: string | null;
  
  // Operations
  updateToneStyle: (style: ToneStyle) => Promise<void>;
  updateNotificationFrequency: (frequency: 'low' | 'medium' | 'high') => Promise<void>;
  addFeedback: (feedback: CreateAIFeedback) => Promise<void>;
  updateInferredState: (state: InferredUserState | null) => Promise<void>;
  resetPreferences: () => Promise<void>;
  markReflectionIntroSeen: () => Promise<void>;
  incrementTasksCompleted: () => Promise<void>;
  
  // Helpers
  recordSuggestionFeedback: (
    suggestionType: string,
    suggestionContent: string,
    reaction: FeedbackReaction
  ) => Promise<void>;
  
  // Refresh
  refresh: () => Promise<void>;
}

export function useUserPreferences(): UseUserPreferencesReturn {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load preferences from IndexedDB
  const loadPreferences = useCallback(async () => {
    try {
      setError(null);
      const prefs = await userPreferencesRepository.get();
      setPreferences(prefs);
    } catch (err) {
      console.error('[useUserPreferences] Failed to load preferences:', err);
      setError('Failed to load preferences');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Computed values
  const toneStyle = preferences?.toneStyle ?? 'gentle';
  const hasSeenReflectionIntro = preferences?.hasSeenReflectionIntro ?? false;
  const tasksCompletedCount = preferences?.tasksCompletedCount ?? 0;

  // Operations
  const updateToneStyle = useCallback(async (style: ToneStyle) => {
    try {
      const updated = await userPreferencesRepository.updateToneStyle(style);
      setPreferences(updated);
    } catch (err) {
      console.error('[useUserPreferences] Failed to update tone style:', err);
      throw err;
    }
  }, []);

  const updateNotificationFrequency = useCallback(async (frequency: 'low' | 'medium' | 'high') => {
    try {
      const updated = await userPreferencesRepository.updateNotificationFrequency(frequency);
      setPreferences(updated);
    } catch (err) {
      console.error('[useUserPreferences] Failed to update notification frequency:', err);
      throw err;
    }
  }, []);

  const addFeedback = useCallback(async (feedback: CreateAIFeedback) => {
    try {
      const updated = await userPreferencesRepository.addFeedback(feedback);
      setPreferences(updated);
    } catch (err) {
      console.error('[useUserPreferences] Failed to add feedback:', err);
      throw err;
    }
  }, []);

  const updateInferredState = useCallback(async (state: InferredUserState | null) => {
    try {
      const updated = await userPreferencesRepository.updateInferredState(state);
      setPreferences(updated);
    } catch (err) {
      console.error('[useUserPreferences] Failed to update inferred state:', err);
      throw err;
    }
  }, []);

  const resetPreferences = useCallback(async () => {
    try {
      const defaultPrefs = await userPreferencesRepository.reset();
      setPreferences(defaultPrefs);
    } catch (err) {
      console.error('[useUserPreferences] Failed to reset preferences:', err);
      throw err;
    }
  }, []);

  const markReflectionIntroSeen = useCallback(async () => {
    try {
      const updated = await userPreferencesRepository.markReflectionIntroSeen();
      setPreferences(updated);
    } catch (err) {
      console.error('[useUserPreferences] Failed to mark reflection intro seen:', err);
      throw err;
    }
  }, []);

  const incrementTasksCompleted = useCallback(async () => {
    try {
      const updated = await userPreferencesRepository.incrementTasksCompleted();
      setPreferences(updated);
    } catch (err) {
      console.error('[useUserPreferences] Failed to increment tasks completed:', err);
      throw err;
    }
  }, []);

  /**
   * Helper: Record feedback for an AI suggestion
   * Simplified API for common use case
   */
  const recordSuggestionFeedback = useCallback(async (
    suggestionType: string,
    suggestionContent: string,
    reaction: FeedbackReaction
  ) => {
    const feedback: CreateAIFeedback = {
      suggestionType,
      suggestionContent,
      reaction,
      inferredStateAtTime: preferences?.inferredState?.state ?? null,
      toneStyleAtTime: preferences?.toneStyle ?? 'gentle',
    };
    await addFeedback(feedback);
  }, [preferences, addFeedback]);

  return {
    preferences,
    toneStyle,
    hasSeenReflectionIntro,
    tasksCompletedCount,
    isLoading,
    error,
    updateToneStyle,
    updateNotificationFrequency,
    addFeedback,
    updateInferredState,
    resetPreferences,
    markReflectionIntroSeen,
    incrementTasksCompleted,
    recordSuggestionFeedback,
    refresh: loadPreferences,
  };
}

/**
 * Get tone-specific prompt instructions
 * Used by AI service to adjust suggestion style
 */
export function getToneInstructions(style: ToneStyle): string {
  switch (style) {
    case 'gentle':
      return `
Tone: Warm and supportive. Use gentle language that feels like a caring friend.
- Start with empathy ("This task might feel heavy...")
- Offer choices, not commands ("Want me to help you...?")
- Keep suggestions light and non-pressuring
- Use encouraging phrases ("No need to finish it all at once")
Example: "This task looks a bit heavy. Want me to help you shrink it into a 5-minute version? No need to finish it all at once."
`;
    case 'concise':
      return `
Tone: Direct and efficient. Minimal words, maximum clarity.
- Skip emotional padding
- Get straight to the point
- Use short, action-oriented phrases
- No unnecessary encouragement
Example: "Try just the first step?"
`;
    case 'coach':
      return `
Tone: Motivational and action-oriented. Push gently but firmly.
- Acknowledge the situation directly
- Encourage immediate action
- Use energizing language
- Still supportive, never judgmental
Example: "This task has been sitting for a few days. Pick the smallest entry point. Start now?"
`;
    case 'silent':
      return `
Tone: Minimal. Only respond when directly asked.
- Keep suggestions extremely brief
- No proactive nudges
- Only essential information
Example: (Prefer not to give unsolicited suggestions)
`;
    default:
      return getToneInstructions('gentle');
  }
}

