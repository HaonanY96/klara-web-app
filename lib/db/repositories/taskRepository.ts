/**
 * Task Repository
 * 
 * Handles all database operations for tasks.
 * Implements Repository pattern for data access abstraction.
 */

import { getDb } from '../index';
import type { Task, CreateTask, UpdateTask, QuadrantType, TaskWithDetails } from '@/types';
import { getQuadrant } from '@/types';
import { generateId } from '@/lib/utils';

// Helper to get database instance
const db = () => getDb();

/**
 * Get current ISO timestamp
 */
function now(): string {
  return new Date().toISOString();
}

/**
 * Task Repository
 */
export const taskRepository = {
  /**
   * Get all tasks
   */
  async getAll(): Promise<Task[]> {
    return db().tasks.orderBy('createdAt').reverse().toArray();
  },

  /**
   * Get all incomplete tasks
   */
  async getIncomplete(): Promise<Task[]> {
    return db().tasks
      .where('completed')
      .equals(0) // Dexie stores boolean as 0/1
      .reverse()
      .sortBy('createdAt');
  },

  /**
   * Get all completed tasks
   */
  async getCompleted(): Promise<Task[]> {
    return db().tasks
      .where('completed')
      .equals(1)
      .reverse()
      .sortBy('completedAt');
  },

  /**
   * Get tasks by quadrant
   */
  async getByQuadrant(quadrant: QuadrantType): Promise<Task[]> {
    const allTasks = await this.getIncomplete();
    return allTasks.filter(task => getQuadrant(task) === quadrant);
  },

  /**
   * Get today's focused tasks (MIT)
   */
  async getFocused(): Promise<Task[]> {
    const today = new Date().toISOString().split('T')[0];
    const tasks = await db().tasks
      .where('isFocused')
      .equals(1)
      .toArray();
    
    // Filter to only today's focused tasks
    return tasks.filter(task => {
      if (!task.focusedAt) return false;
      return task.focusedAt.startsWith(today);
    });
  },

  /**
   * Get count of today's focused tasks
   */
  async getFocusedCount(): Promise<number> {
    const focused = await this.getFocused();
    return focused.length;
  },

  /**
   * Get a single task by ID
   */
  async getById(id: string): Promise<Task | undefined> {
    return db().tasks.get(id);
  },

  /**
   * Get task with its subtasks and AI suggestions (for UI)
   */
  async getWithDetails(id: string): Promise<TaskWithDetails | undefined> {
    const task = await this.getById(id);
    if (!task) return undefined;

    const subTasks = await db().subTasks
      .where('taskId')
      .equals(id)
      .sortBy('order');

    const aiSuggestionRecord = await db().aiSuggestions
      .where('taskId')
      .equals(id)
      .first();

    return {
      ...task,
      subTasks,
      aiSuggestions: aiSuggestionRecord?.suggestions ?? [],
      showSuggestions: false,
    };
  },

  /**
   * Get all tasks with details (for UI)
   */
  async getAllWithDetails(): Promise<TaskWithDetails[]> {
    const tasks = await this.getAll();
    const allSubTasks = await db().subTasks.toArray();
    const allAISuggestions = await db().aiSuggestions.toArray();

    return tasks.map(task => {
      const subTasks = allSubTasks
        .filter(st => st.taskId === task.id)
        .sort((a, b) => a.order - b.order);
      
      const aiSuggestionRecord = allAISuggestions.find(s => s.taskId === task.id);

      return {
        ...task,
        subTasks,
        aiSuggestions: aiSuggestionRecord?.suggestions ?? [],
        showSuggestions: false,
      };
    });
  },

  /**
   * Create a new task
   * @param data - Task creation data
   * @param customId - Optional custom ID (used for seed data)
   * @param aiSuggestions - Optional AI suggestions to store
   * @param showSuggestions - Whether to show suggestions expanded
   */
  async create(
    data: CreateTask, 
    customId?: string, 
    aiSuggestions?: string[],
    showSuggestions?: boolean
  ): Promise<Task> {
    const timestamp = now();
    const task: Task = {
      ...data,
      id: customId || generateId(),
      createdAt: timestamp,
      updatedAt: timestamp,
      completedAt: null,
      focusedAt: data.isFocused ? timestamp : null,
    };

    await db().tasks.add(task);
    
    // Store AI suggestions if provided
    if (aiSuggestions && aiSuggestions.length > 0) {
      // Set expiry to 7 days from now
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await db().aiSuggestions.add({
        id: generateId(),
        taskId: task.id,
        suggestions: aiSuggestions,
        createdAt: timestamp,
        expiresAt,
      });
    }
    
    return task;
  },

  /**
   * Update a task
   */
  async update(data: UpdateTask): Promise<Task> {
    const { id, ...updates } = data;
    const timestamp = now();

    await db().tasks.update(id, {
      ...updates,
      updatedAt: timestamp,
    });

    const updated = await this.getById(id);
    if (!updated) throw new Error(`Task ${id} not found after update`);
    
    return updated;
  },

  /**
   * Toggle task completion status
   */
  async toggleComplete(id: string): Promise<Task> {
    const task = await this.getById(id);
    if (!task) throw new Error(`Task ${id} not found`);

    const timestamp = now();
    const completed = !task.completed;

    await db().tasks.update(id, {
      completed,
      completedAt: completed ? timestamp : null,
      updatedAt: timestamp,
      // Clear focus when completed
      isFocused: completed ? false : task.isFocused,
      focusedAt: completed ? null : task.focusedAt,
    });

    return (await this.getById(id))!;
  },

  /**
   * Toggle task pinned status
   */
  async togglePinned(id: string): Promise<Task> {
    const task = await this.getById(id);
    if (!task) throw new Error(`Task ${id} not found`);

    await db().tasks.update(id, {
      isPinned: !task.isPinned,
      updatedAt: now(),
    });

    return (await this.getById(id))!;
  },

  /**
   * Toggle task focused status (MIT)
   * Returns false if max focus limit (3) reached
   */
  async toggleFocused(id: string): Promise<{ success: boolean; task?: Task; error?: string }> {
    const task = await this.getById(id);
    if (!task) return { success: false, error: 'Task not found' };

    // If unfocusing, just do it
    if (task.isFocused) {
      await db().tasks.update(id, {
        isFocused: false,
        focusedAt: null,
        updatedAt: now(),
      });
      return { success: true, task: (await this.getById(id))! };
    }

    // If focusing, check limit
    const currentFocusedCount = await this.getFocusedCount();
    if (currentFocusedCount >= 3) {
      return { success: false, error: 'Maximum 3 focused tasks allowed' };
    }

    await db().tasks.update(id, {
      isFocused: true,
      focusedAt: now(),
      updatedAt: now(),
    });

    return { success: true, task: (await this.getById(id))! };
  },

  /**
   * Update task quadrant (importance/urgency)
   */
  async updateQuadrant(id: string, importance: 'high' | 'low', urgency: 'high' | 'low'): Promise<Task> {
    await db().tasks.update(id, {
      importance,
      urgency,
      updatedAt: now(),
    });

    return (await this.getById(id))!;
  },

  /**
   * Update task due date
   */
  async updateDueDate(id: string, dueDate: string | null): Promise<Task> {
    await db().tasks.update(id, {
      dueDate,
      updatedAt: now(),
    });

    return (await this.getById(id))!;
  },

  /**
   * Delete a task and its subtasks
   */
  async delete(id: string): Promise<void> {
    // Delete all subtasks first
    await db().subTasks.where('taskId').equals(id).delete();
    // Delete AI suggestions
    await db().aiSuggestions.where('taskId').equals(id).delete();
    // Delete the task
    await db().tasks.delete(id);
  },

  /**
   * Clear yesterday's focused tasks
   * Should be called on app startup or at midnight
   */
  async clearOldFocus(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const focusedTasks = await db().tasks
      .where('isFocused')
      .equals(1)
      .toArray();

    let clearedCount = 0;
    for (const task of focusedTasks) {
      if (task.focusedAt && !task.focusedAt.startsWith(today)) {
        await db().tasks.update(task.id, {
          isFocused: false,
          focusedAt: null,
          updatedAt: now(),
        });
        clearedCount++;
      }
    }

    if (clearedCount > 0) {
      console.log(`[Kino] Cleared ${clearedCount} old focused tasks`);
    }

    return clearedCount;
  },

  /**
   * Get tasks due today or overdue
   */
  async getDueToday(): Promise<Task[]> {
    const today = new Date().toISOString().split('T')[0];
    const tasks = await this.getIncomplete();
    
    return tasks.filter(task => {
      if (!task.dueDate) return false;
      return task.dueDate <= today;
    });
  },
};

