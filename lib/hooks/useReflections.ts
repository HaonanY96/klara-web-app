'use client';

/**
 * useReflections Hook
 *
 * React hook for managing reflections with IndexedDB persistence.
 * Supports multiple entries per day (timeline style).
 */

import { useState, useEffect, useCallback } from 'react';
import { reflectionRepository } from '@/lib/db/repositories';
import type { Reflection, MoodType } from '@/types';

interface UseReflectionsReturn {
  // Data
  reflections: Reflection[];
  todayReflection: Reflection | null;
  streak: number;
  moodStats: Record<MoodType, number>;

  // State
  isLoading: boolean;
  error: string | null;

  // Operations
  addEntry: (text: string, mood: MoodType | null, prompt: string) => Promise<Reflection>;
  updateEntry: (
    reflectionId: string,
    entryId: string,
    updates: { text?: string; mood?: MoodType | null }
  ) => Promise<Reflection>;
  deleteEntry: (reflectionId: string, entryId: string) => Promise<void>;
  deleteReflection: (id: string) => Promise<void>;

  // Refresh
  refresh: () => Promise<void>;
}

export function useReflections(): UseReflectionsReturn {
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [todayReflection, setTodayReflection] = useState<Reflection | null>(null);
  const [streak, setStreak] = useState(0);
  const [moodStats, setMoodStats] = useState<Record<MoodType, number>>({
    Flow: 0,
    Neutral: 0,
    Drained: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [allReflections, today, currentStreak, stats] = await Promise.all([
        reflectionRepository.getRecent(30),
        reflectionRepository.getToday(),
        reflectionRepository.getStreak(),
        reflectionRepository.getMoodStats(30),
      ]);

      setReflections(allReflections);
      setTodayReflection(today ?? null);
      setStreak(currentStreak);
      setMoodStats(stats);
    } catch (err) {
      console.error('[useReflections] Failed to load:', err);
      setError('Failed to load reflections');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Add a new entry to today's reflection
  const addEntry = useCallback(
    async (text: string, mood: MoodType | null, prompt: string): Promise<Reflection> => {
      const reflection = await reflectionRepository.addEntryToday({
        text,
        mood,
        prompt,
      });
      await loadData();
      return reflection;
    },
    [loadData]
  );

  // Update a specific entry
  const updateEntry = useCallback(
    async (
      reflectionId: string,
      entryId: string,
      updates: { text?: string; mood?: MoodType | null }
    ): Promise<Reflection> => {
      const reflection = await reflectionRepository.updateEntry(reflectionId, entryId, updates);
      await loadData();
      return reflection;
    },
    [loadData]
  );

  // Delete a specific entry
  const deleteEntry = useCallback(
    async (reflectionId: string, entryId: string) => {
      await reflectionRepository.deleteEntry(reflectionId, entryId);
      await loadData();
    },
    [loadData]
  );

  // Delete entire reflection
  const deleteReflection = useCallback(
    async (id: string) => {
      await reflectionRepository.delete(id);
      await loadData();
    },
    [loadData]
  );

  return {
    reflections,
    todayReflection,
    streak,
    moodStats,
    isLoading,
    error,
    addEntry,
    updateEntry,
    deleteEntry,
    deleteReflection,
    refresh: loadData,
  };
}
