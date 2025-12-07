/**
 * Klara Database Configuration
 *
 * Uses Dexie.js as IndexedDB wrapper for local data persistence.
 * This module is client-side only.
 */

import Dexie, { type Table } from 'dexie';
import type { Task, SubTask, Reflection, AISuggestion, HabitData, UserPreferences } from '@/types';

/**
 * Klara Database Schema
 *
 * Version History:
 * - v1: Initial schema with tasks, subtasks, reflections
 */
export class KlaraDatabase extends Dexie {
  // Table declarations
  tasks!: Table<Task, string>;
  subTasks!: Table<SubTask, string>;
  reflections!: Table<Reflection, string>;
  aiSuggestions!: Table<AISuggestion, string>;
  habitData!: Table<HabitData, string>;
  userPreferences!: Table<UserPreferences, string>;

  constructor() {
    super('KlaraDB');

    // Schema definition
    // Note: Only indexed fields need to be declared here
    // Dexie will store all object properties regardless

    // V1: Initial schema
    this.version(1).stores({
      tasks:
        'id, completed, importance, urgency, dueDate, isPinned, isFocused, createdAt, updatedAt',
      subTasks: 'id, taskId, completed, order',
      reflections: 'id, date, mood',
      aiSuggestions: 'id, taskId, expiresAt',
      habitData: 'id, date',
    });

    // V2: Add userPreferences table for AI personalization
    this.version(2).stores({
      // Keep existing tables unchanged
      tasks:
        'id, completed, importance, urgency, dueDate, isPinned, isFocused, createdAt, updatedAt',
      subTasks: 'id, taskId, completed, order',
      reflections: 'id, date, mood',
      aiSuggestions: 'id, taskId, expiresAt',
      habitData: 'id, date',
      // New: User Preferences (singleton per user, indexed by id)
      userPreferences: 'id, toneStyle, updatedAt',
    });

    // V3: Update reflections to use moods array instead of single mood
    // Clear old reflections data during upgrade
    this.version(3)
      .stores({
        tasks:
          'id, completed, importance, urgency, dueDate, isPinned, isFocused, createdAt, updatedAt',
        subTasks: 'id, taskId, completed, order',
        reflections: 'id, date', // Remove mood index since it's now an array
        aiSuggestions: 'id, taskId, expiresAt',
        habitData: 'id, date',
        userPreferences: 'id, toneStyle, updatedAt',
      })
      .upgrade(async tx => {
        // Clear old reflections with incompatible schema
        await tx.table('reflections').clear();
        console.log('[Klara DB] Cleared old reflections for V3 migration');
      });

    // V4: Update reflections to use entries array (multiple entries per day)
    // Clear old reflections data during upgrade
    this.version(4)
      .stores({
        tasks:
          'id, completed, importance, urgency, dueDate, isPinned, isFocused, createdAt, updatedAt',
        subTasks: 'id, taskId, completed, order',
        reflections: 'id, date', // entries array stored but not indexed
        aiSuggestions: 'id, taskId, expiresAt',
        habitData: 'id, date',
        userPreferences: 'id, toneStyle, updatedAt',
      })
      .upgrade(async tx => {
        // Clear old reflections with incompatible schema (moods -> entries)
        await tx.table('reflections').clear();
        console.log('[Klara DB] Cleared old reflections for V4 migration (moods -> entries)');
      });

    // V5: Track AI suggestion status and task signature
    this.version(5)
      .stores({
        tasks:
          'id, completed, importance, urgency, dueDate, isPinned, isFocused, createdAt, updatedAt',
        subTasks: 'id, taskId, completed, order',
        reflections: 'id, date',
        aiSuggestions: 'id, taskId, expiresAt, status',
        habitData: 'id, date',
        userPreferences: 'id, toneStyle, updatedAt',
      })
      .upgrade(async tx => {
        const aiSuggestions = tx.table('aiSuggestions');
        await aiSuggestions.toCollection().modify(record => {
          // Dexie mutates in place; ensure defaults exist
          (record as { status?: string }).status = record.status ?? 'active';
          (record as { taskSignature?: string }).taskSignature = record.taskSignature ?? '';
        });
      });

    // V6: Add ordering fields for tasks and quadrant ordering preference
    this.version(6)
      .stores({
        tasks:
          'id, completed, importance, urgency, dueDate, isPinned, isFocused, createdAt, updatedAt, pinnedAt, focusOrder, quadrantOrder',
        subTasks: 'id, taskId, completed, order',
        reflections: 'id, date',
        aiSuggestions: 'id, taskId, expiresAt, status',
        habitData: 'id, date',
        userPreferences: 'id, toneStyle, updatedAt, enableQuadrantOrdering',
      })
      .upgrade(async tx => {
        const tasksTable = tx.table('tasks');
        await tasksTable.toCollection().modify(task => {
          const t = task as {
            pinnedAt?: string | null;
            isPinned?: number | boolean;
            createdAt?: string;
            focusOrder?: number | null;
            quadrantOrder?: number | null;
          };
          // Default pinnedAt to createdAt when pinned
          if (t.isPinned && !t.pinnedAt && t.createdAt) {
            t.pinnedAt = t.createdAt;
          }
          // Ensure ordering fields exist
          if (typeof t.focusOrder === 'undefined') t.focusOrder = null;
          if (typeof t.quadrantOrder === 'undefined') t.quadrantOrder = null;
        });

        const prefsTable = tx.table('userPreferences');
        await prefsTable.toCollection().modify(pref => {
          const p = pref as { enableQuadrantOrdering?: boolean };
          if (typeof p.enableQuadrantOrdering === 'undefined') {
            p.enableQuadrantOrdering = false;
          }
        });
      });
  }
}

// Lazy singleton - only create on first access in browser
let _db: KlaraDatabase | null = null;

export function getDb(): KlaraDatabase {
  if (typeof window === 'undefined') {
    throw new Error('Database can only be accessed on the client side');
  }
  if (!_db) {
    _db = new KlaraDatabase();
  }
  return _db;
}

// For backward compatibility
export const db =
  typeof window !== 'undefined' ? new KlaraDatabase() : (null as unknown as KlaraDatabase);

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
      console.log('[Klara DB] First run detected, database initialized');
    } else {
      console.log(`[Klara DB] Database loaded with ${taskCount} tasks`);
    }
  } catch (error) {
    console.error('[Klara DB] Failed to initialize database:', error);
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
  console.log('[Klara DB] All data cleared');
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
