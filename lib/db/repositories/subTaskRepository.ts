/**
 * SubTask Repository
 * 
 * Handles all database operations for subtasks.
 */

import { getDb } from '../index';
import type { SubTask, CreateSubTask, UpdateSubTask } from '@/types';

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
 * SubTask Repository
 */
export const subTaskRepository = {
  /**
   * Get all subtasks for a task
   */
  async getByTaskId(taskId: string): Promise<SubTask[]> {
    return db().subTasks
      .where('taskId')
      .equals(taskId)
      .sortBy('order');
  },

  /**
   * Get a single subtask by ID
   */
  async getById(id: string): Promise<SubTask | undefined> {
    return db().subTasks.get(id);
  },

  /**
   * Get completion stats for a task's subtasks
   */
  async getStats(taskId: string): Promise<{ total: number; completed: number }> {
    const subTasks = await this.getByTaskId(taskId);
    return {
      total: subTasks.length,
      completed: subTasks.filter(st => st.completed).length,
    };
  },

  /**
   * Create a new subtask
   * @param data - SubTask creation data
   * @param customId - Optional custom ID (used for seed data)
   */
  async create(data: CreateSubTask, customId?: string): Promise<SubTask> {
    // Get the next order number
    const existing = await this.getByTaskId(data.taskId);
    const maxOrder = existing.length > 0 
      ? Math.max(...existing.map(st => st.order)) 
      : -1;

    const timestamp = now();
    const subTask: SubTask = {
      ...data,
      id: customId || generateId(),
      order: maxOrder + 1,
      createdAt: timestamp,
      completedAt: data.completed ? timestamp : null,
    };

    await db().subTasks.add(subTask);
    return subTask;
  },

  /**
   * Create multiple subtasks at once (for AI suggestions)
   */
  async createMany(taskId: string, texts: string[], isAISuggested: boolean = false): Promise<SubTask[]> {
    const existing = await this.getByTaskId(taskId);
    const startOrder = existing.length > 0 
      ? Math.max(...existing.map(st => st.order)) + 1 
      : 0;

    const timestamp = now();
    const subTasks: SubTask[] = texts.map((text, index) => ({
      id: generateId(),
      taskId,
      text,
      completed: false,
      isAISuggested,
      order: startOrder + index,
      createdAt: timestamp,
      completedAt: null,
    }));

    await db().subTasks.bulkAdd(subTasks);
    return subTasks;
  },

  /**
   * Update a subtask
   */
  async update(data: UpdateSubTask): Promise<SubTask> {
    const { id, ...updates } = data;
    
    await db().subTasks.update(id, updates);

    const updated = await this.getById(id);
    if (!updated) throw new Error(`SubTask ${id} not found after update`);
    
    return updated;
  },

  /**
   * Toggle subtask completion status
   */
  async toggleComplete(id: string): Promise<SubTask> {
    const subTask = await this.getById(id);
    if (!subTask) throw new Error(`SubTask ${id} not found`);

    const completed = !subTask.completed;

    await db().subTasks.update(id, {
      completed,
      completedAt: completed ? now() : null,
    });

    return (await this.getById(id))!;
  },

  /**
   * Delete a subtask
   */
  async delete(id: string): Promise<void> {
    await db().subTasks.delete(id);
  },

  /**
   * Delete all subtasks for a task
   */
  async deleteByTaskId(taskId: string): Promise<number> {
    return db().subTasks.where('taskId').equals(taskId).delete();
  },

  /**
   * Reorder subtasks
   */
  async reorder(taskId: string, orderedIds: string[]): Promise<void> {
    const updates = orderedIds.map((id, index) => 
      db().subTasks.update(id, { order: index })
    );
    await Promise.all(updates);
  },
};

