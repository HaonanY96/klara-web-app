/**
 * Kino Database Configuration
 * 
 * Uses Dexie.js as IndexedDB wrapper for local data persistence.
 * This module is client-side only.
 */

import Dexie, { type Table } from 'dexie';
import type { Task, SubTask, Reflection, AISuggestion, HabitData, UserPreferences } from '@/types';

/**
 * Kino Database Schema
 * 
 * Version History:
 * - v1: Initial schema with tasks, subtasks, reflections
 */
export class KinoDatabase extends Dexie {
  // Table declarations
  tasks!: Table<Task, string>;
  subTasks!: Table<SubTask, string>;
  reflections!: Table<Reflection, string>;
  aiSuggestions!: Table<AISuggestion, string>;
  habitData!: Table<HabitData, string>;
  userPreferences!: Table<UserPreferences, string>;

  constructor() {
    super('KinoDB');

    // Schema definition
    // Note: Only indexed fields need to be declared here
    // Dexie will store all object properties regardless
    
    // V1: Initial schema
    this.version(1).stores({
      tasks: 'id, completed, importance, urgency, dueDate, isPinned, isFocused, createdAt, updatedAt',
      subTasks: 'id, taskId, completed, order',
      reflections: 'id, date, mood',
      aiSuggestions: 'id, taskId, expiresAt',
      habitData: 'id, date',
    });

    // V2: Add userPreferences table for AI personalization
    this.version(2).stores({
      // Keep existing tables unchanged
      tasks: 'id, completed, importance, urgency, dueDate, isPinned, isFocused, createdAt, updatedAt',
      subTasks: 'id, taskId, completed, order',
      reflections: 'id, date, mood',
      aiSuggestions: 'id, taskId, expiresAt',
      habitData: 'id, date',
      // New: User Preferences (singleton per user, indexed by id)
      userPreferences: 'id, toneStyle, updatedAt',
    });

    // V3: Update reflections to use moods array instead of single mood
    // Clear old reflections data during upgrade
    this.version(3).stores({
      tasks: 'id, completed, importance, urgency, dueDate, isPinned, isFocused, createdAt, updatedAt',
      subTasks: 'id, taskId, completed, order',
      reflections: 'id, date', // Remove mood index since it's now an array
      aiSuggestions: 'id, taskId, expiresAt',
      habitData: 'id, date',
      userPreferences: 'id, toneStyle, updatedAt',
    }).upgrade(async tx => {
      // Clear old reflections with incompatible schema
      await tx.table('reflections').clear();
      console.log('[Kino DB] Cleared old reflections for V3 migration');
    });

    // V4: Update reflections to use entries array (multiple entries per day)
    // Clear old reflections data during upgrade
    this.version(4).stores({
      tasks: 'id, completed, importance, urgency, dueDate, isPinned, isFocused, createdAt, updatedAt',
      subTasks: 'id, taskId, completed, order',
      reflections: 'id, date', // entries array stored but not indexed
      aiSuggestions: 'id, taskId, expiresAt',
      habitData: 'id, date',
      userPreferences: 'id, toneStyle, updatedAt',
    }).upgrade(async tx => {
      // Clear old reflections with incompatible schema (moods -> entries)
      await tx.table('reflections').clear();
      console.log('[Kino DB] Cleared old reflections for V4 migration (moods -> entries)');
    });
  }
}

// Lazy singleton - only create on first access in browser
let _db: KinoDatabase | null = null;

export function getDb(): KinoDatabase {
  if (typeof window === 'undefined') {
    throw new Error('Database can only be accessed on the client side');
  }
  if (!_db) {
    _db = new KinoDatabase();
  }
  return _db;
}

// For backward compatibility
export const db = typeof window !== 'undefined' ? new KinoDatabase() : (null as unknown as KinoDatabase);

/**
 * Initialize database with default data if empty
 * Called on app startup
 */
export async function initializeDatabase(): Promise<void> {
  try {
    const database = getDb();
    // Check if this is first run (no tasks exist)
    const taskCount = await database.tasks.count();
    
    if (taskCount === 0) {
      console.log('[Kino DB] First run detected, database initialized');
    } else {
      console.log(`[Kino DB] Database loaded with ${taskCount} tasks`);
    }
  } catch (error) {
    console.error('[Kino DB] Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Clear all data from the database
 * Use with caution - primarily for testing/debugging
 */
export async function clearDatabase(): Promise<void> {
  const database = getDb();
  await database.tasks.clear();
  await database.subTasks.clear();
  await database.reflections.clear();
  await database.aiSuggestions.clear();
  await database.habitData.clear();
  console.log('[Kino DB] All data cleared');
}

/**
 * Export all data as JSON (for backup/migration)
 */
export async function exportAllData(): Promise<{
  tasks: Task[];
  subTasks: SubTask[];
  reflections: Reflection[];
  exportedAt: string;
}> {
  const database = getDb();
  const [tasks, subTasks, reflections] = await Promise.all([
    database.tasks.toArray(),
    database.subTasks.toArray(),
    database.reflections.toArray(),
  ]);

  return {
    tasks,
    subTasks,
    reflections,
    exportedAt: new Date().toISOString(),
  };
}

