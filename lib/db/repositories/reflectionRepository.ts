/**
 * Reflection Repository
 * 
 * Handles all database operations for reflection entries.
 * A Reflection contains multiple entries per day (timeline style).
 */

import { getDb } from '../index';
import type { Reflection, ReflectionEntry, CreateReflection, UpdateReflection, MoodType } from '@/types';

// Helper to get database instance
const db = () => getDb();

/**
 * Generate a unique ID
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Get current ISO timestamp
 */
function now(): string {
  return new Date().toISOString();
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function today(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Reflection Repository
 */
export const reflectionRepository = {
  /**
   * Get all reflections, newest first
   */
  async getAll(): Promise<Reflection[]> {
    return db().reflections.orderBy('date').reverse().toArray();
  },

  /**
   * Get reflections with pagination
   */
  async getRecent(limit: number = 7, offset: number = 0): Promise<Reflection[]> {
    return db().reflections
      .orderBy('date')
      .reverse()
      .offset(offset)
      .limit(limit)
      .toArray();
  },

  /**
   * Get reflection by ID
   */
  async getById(id: string): Promise<Reflection | undefined> {
    return db().reflections.get(id);
  },

  /**
   * Get reflection by date
   */
  async getByDate(date: string): Promise<Reflection | undefined> {
    return db().reflections.where('date').equals(date).first();
  },

  /**
   * Get today's reflection
   */
  async getToday(): Promise<Reflection | undefined> {
    return this.getByDate(today());
  },

  /**
   * Check if today's reflection exists
   */
  async hasTodayReflection(): Promise<boolean> {
    const reflection = await this.getToday();
    return !!reflection;
  },

  /**
   * Get reflections that contain a specific mood
   */
  async getByMood(mood: MoodType): Promise<Reflection[]> {
    const all = await this.getAll();
    return all.filter(r => r.entries.some(e => e.mood === mood));
  },

  /**
   * Get mood stats for a date range
   * Counts each entry's mood
   */
  async getMoodStats(days: number = 30): Promise<Record<MoodType, number>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const reflections = await db().reflections
      .where('date')
      .aboveOrEqual(startDateStr)
      .toArray();

    const stats: Record<MoodType, number> = {
      'Flow': 0,
      'Neutral': 0,
      'Drained': 0,
    };

    reflections.forEach(r => {
      r.entries.forEach(entry => {
        if (entry.mood) {
          stats[entry.mood]++;
        }
      });
    });

    return stats;
  },

  /**
   * Create a new reflection for a date
   */
  async create(data: CreateReflection): Promise<Reflection> {
    // Check if reflection for this date already exists
    const existing = await this.getByDate(data.date);
    if (existing) {
      throw new Error(`Reflection for ${data.date} already exists`);
    }

    const timestamp = now();
    const reflection: Reflection = {
      ...data,
      id: generateId(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await db().reflections.add(reflection);
    return reflection;
  },

  /**
   * Add a new entry to today's reflection
   * Creates the reflection if it doesn't exist
   */
  async addEntryToday(data: { text: string; mood: MoodType | null; prompt: string }): Promise<Reflection> {
    const todayDate = today();
    const existing = await this.getByDate(todayDate);

    const newEntry: ReflectionEntry = {
      id: generateId(),
      text: data.text,
      mood: data.mood,
      prompt: data.prompt,
      recordedAt: now(),
    };

    if (existing) {
      // Add new entry to existing reflection
      const updatedEntries = [...existing.entries, newEntry];
      return this.update({
        id: existing.id,
        entries: updatedEntries,
      });
    } else {
      // Create new reflection with first entry
      return this.create({
        date: todayDate,
        entries: [newEntry],
      });
    }
  },

  /**
   * Update a reflection
   */
  async update(data: UpdateReflection): Promise<Reflection> {
    const { id, ...updates } = data;
    
    await db().reflections.update(id, {
      ...updates,
      updatedAt: now(),
    });

    const updated = await this.getById(id);
    if (!updated) throw new Error(`Reflection ${id} not found after update`);
    
    return updated;
  },

  /**
   * Update a specific entry within a reflection
   */
  async updateEntry(reflectionId: string, entryId: string, updates: { text?: string; mood?: MoodType | null }): Promise<Reflection> {
    const reflection = await this.getById(reflectionId);
    if (!reflection) throw new Error(`Reflection ${reflectionId} not found`);

    const updatedEntries = reflection.entries.map(entry => 
      entry.id === entryId
        ? { ...entry, ...updates }
        : entry
    );

    return this.update({
      id: reflectionId,
      entries: updatedEntries,
    });
  },

  /**
   * Delete a specific entry within a reflection
   * If it's the last entry, deletes the entire reflection
   */
  async deleteEntry(reflectionId: string, entryId: string): Promise<void> {
    const reflection = await this.getById(reflectionId);
    if (!reflection) throw new Error(`Reflection ${reflectionId} not found`);

    const updatedEntries = reflection.entries.filter(entry => entry.id !== entryId);

    if (updatedEntries.length === 0) {
      // Delete entire reflection if no entries left
      await this.delete(reflectionId);
    } else {
      await this.update({
        id: reflectionId,
        entries: updatedEntries,
      });
    }
  },

  /**
   * Delete a reflection
   */
  async delete(id: string): Promise<void> {
    await db().reflections.delete(id);
  },

  /**
   * Get streak - consecutive days with reflections
   */
  async getStreak(): Promise<number> {
    const reflections = await this.getAll();
    if (reflections.length === 0) return 0;

    const dates = reflections.map(r => r.date).sort().reverse();
    let streak = 0;
    let expectedDate = today();

    for (const date of dates) {
      if (date === expectedDate) {
        streak++;
        // Calculate previous day
        const d = new Date(expectedDate);
        d.setDate(d.getDate() - 1);
        expectedDate = d.toISOString().split('T')[0];
      } else if (date < expectedDate) {
        // Streak broken
        break;
      }
    }

    return streak;
  },

  /**
   * Get total reflection count (number of days with reflections)
   */
  async getCount(): Promise<number> {
    return db().reflections.count();
  },

  /**
   * Get total entry count across all reflections
   */
  async getEntryCount(): Promise<number> {
    const all = await this.getAll();
    return all.reduce((sum, r) => sum + r.entries.length, 0);
  },
};
