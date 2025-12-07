/**
 * Task Repository
 *
 * Handles all database operations for tasks.
 * Implements Repository pattern for data access abstraction.
 */

import { getDb } from '../index';
import type {
  Task,
  CreateTask,
  UpdateTask,
  QuadrantType,
  TaskWithDetails,
  AISuggestion,
} from '@/types';
import { getQuadrant } from '@/types';
import { generateId, buildTaskSignature } from '@/lib/utils';

// Helper to get database instance
const db = () => getDb();

/**
 * Get current ISO timestamp
 */
function now(): string {
  return new Date().toISOString();
}

function computeSignature(task: Task): string {
  return buildTaskSignature({
    text: task.text,
    importance: task.importance,
    urgency: task.urgency,
    dueDate: task.dueDate,
  });
}

function isActiveSuggestion(record: AISuggestion | undefined, signature: string): boolean {
  if (!record) return false;
  if (record.status !== 'active') {
    return false;
  }
  return record.taskSignature === signature;
}

async function removeSuggestionRecord(recordId: string): Promise<void> {
  await db().aiSuggestions.delete(recordId);
}

async function invalidateSuggestionsIfSignatureChanged(before: Task, after: Task): Promise<void> {
  if (computeSignature(before) === computeSignature(after)) {
    return;
  }
  await db().aiSuggestions.where('taskId').equals(after.id).delete();
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
    return db()
      .tasks.where('completed')
      .equals(0) // Dexie stores boolean as 0/1
      .reverse()
      .sortBy('createdAt');
  },

  /**
   * Get all completed tasks
   */
  async getCompleted(): Promise<Task[]> {
    return db().tasks.where('completed').equals(1).reverse().sortBy('completedAt');
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
    const tasks = await db().tasks.where('isFocused').equals(1).toArray();

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

    const subTasks = await db().subTasks.where('taskId').equals(id).sortBy('order');

    const aiSuggestionRecord = await db().aiSuggestions.where('taskId').equals(id).first();
    const signature = computeSignature(task);
    let aiSuggestions: string[] = [];

    if (isActiveSuggestion(aiSuggestionRecord, signature)) {
      aiSuggestions = aiSuggestionRecord!.suggestions;
    } else if (aiSuggestionRecord) {
      await removeSuggestionRecord(aiSuggestionRecord.id);
    }

    return {
      ...task,
      subTasks,
      aiSuggestions,
      showSuggestions: false,
    };
  },

  /**
   * Get all tasks with details (for UI)
   */
  async getAllWithDetails(): Promise<TaskWithDetails[]> {
    const tasks = await this.getAll();
    const [allSubTasks, allAISuggestions] = await Promise.all([
      db().subTasks.toArray(),
      db().aiSuggestions.toArray(),
    ]);

    const suggestionsByTaskId = new Map<string, AISuggestion>();
    allAISuggestions.forEach(record => suggestionsByTaskId.set(record.taskId, record));
    const cleanupIds: string[] = [];

    const taskDetails = tasks.map(task => {
      const subTasks = allSubTasks
        .filter(st => st.taskId === task.id)
        .sort((a, b) => a.order - b.order);

      const aiSuggestionRecord = suggestionsByTaskId.get(task.id);
      const signature = computeSignature(task);
      let aiSuggestions: string[] = [];

      if (isActiveSuggestion(aiSuggestionRecord, signature)) {
        aiSuggestions = aiSuggestionRecord!.suggestions;
      } else if (aiSuggestionRecord) {
        cleanupIds.push(aiSuggestionRecord.id);
      }

      const taskWithDetails: TaskWithDetails = {
        ...task,
        subTasks,
        aiSuggestions,
        showSuggestions: false,
      };

      return taskWithDetails;
    });
    if (cleanupIds.length) {
      await db().aiSuggestions.bulkDelete(cleanupIds);
    }
    return taskDetails;
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
    _showSuggestions?: boolean
  ): Promise<Task> {
    const timestamp = now();
    const task: Task = {
      ...data,
      id: customId || generateId(),
      pinnedAt: data.isPinned ? timestamp : null,
      focusOrder: null,
      quadrantOrder: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      completedAt: null,
      focusedAt: data.isFocused ? timestamp : null,
    };

    await db().tasks.add(task);

    // Store AI suggestions if provided
    if (aiSuggestions && aiSuggestions.length > 0) {
      // Set expiry to 24 hours (align with AI cache TTL)
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await db().aiSuggestions.add({
        id: generateId(),
        taskId: task.id,
        suggestions: aiSuggestions,
        taskSignature: computeSignature(task),
        status: 'active',
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

    const before = await this.getById(id);
    if (!before) throw new Error(`Task ${id} not found`);

    await db().tasks.update(id, {
      ...updates,
      updatedAt: timestamp,
    });

    const updated = await this.getById(id);
    if (!updated) throw new Error(`Task ${id} not found after update`);

    await invalidateSuggestionsIfSignatureChanged(before, updated);

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

    const nowTs = now();
    await db().tasks.update(id, {
      isPinned: !task.isPinned,
      pinnedAt: !task.isPinned ? nowTs : task.pinnedAt,
      updatedAt: nowTs,
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
        focusOrder: null,
        updatedAt: now(),
      });
      return { success: true, task: (await this.getById(id))! };
    }

    // If focusing, check limit
    const currentFocusedCount = await this.getFocusedCount();
    if (currentFocusedCount >= 3) {
      return { success: false, error: 'Maximum 3 focused tasks allowed' };
    }

    const nowTs = now();
    await db().tasks.update(id, {
      isFocused: true,
      focusedAt: nowTs,
      // default insert at top by using newest focusOrder; will be recomputed on reorder
      focusOrder: null,
      updatedAt: nowTs,
    });

    return { success: true, task: (await this.getById(id))! };
  },

  /**
   * Update task quadrant (importance/urgency)
   */
  async updateQuadrant(
    id: string,
    importance: 'high' | 'low',
    urgency: 'high' | 'low'
  ): Promise<Task> {
    const before = await this.getById(id);
    if (!before) throw new Error(`Task ${id} not found`);

    // Determine next order for target quadrant (append to end)
    const targetQuadrantTasks = await this.getByQuadrant(
      getQuadrant({ ...before, importance, urgency } as Task)
    );
    const maxOrder = targetQuadrantTasks.reduce<number>((acc, t) => {
      const val = typeof t.quadrantOrder === 'number' ? t.quadrantOrder : -1;
      return Math.max(acc, val);
    }, -1);

    await db().tasks.update(id, {
      importance,
      urgency,
      quadrantOrder: maxOrder + 1,
      updatedAt: now(),
    });

    const updated = await this.getById(id);
    if (!updated) throw new Error(`Task ${id} not found after quadrant update`);
    await invalidateSuggestionsIfSignatureChanged(before, updated);

    return updated;
  },

  /**
   * Update task due date
   */
  async updateDueDate(id: string, dueDate: string | null): Promise<Task> {
    const before = await this.getById(id);
    if (!before) throw new Error(`Task ${id} not found`);

    await db().tasks.update(id, {
      dueDate,
      updatedAt: now(),
    });

    const updated = await this.getById(id);
    if (!updated) throw new Error(`Task ${id} not found after due date update`);
    await invalidateSuggestionsIfSignatureChanged(before, updated);

    return updated;
  },

  /**
   * Remove AI suggestions for a task (used when dismissed)
   */
  async clearAISuggestions(taskId: string): Promise<void> {
    await db().aiSuggestions.where('taskId').equals(taskId).delete();
  },

  /**
   * Mark AI suggestions as consumed to prevent re-surfacing
   */
  async markSuggestionsConsumed(taskId: string): Promise<void> {
    const suggestion = await db().aiSuggestions.where('taskId').equals(taskId).first();
    if (!suggestion) return;
    await db().aiSuggestions.update(suggestion.id, { status: 'consumed' });
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
    const focusedTasks = await db().tasks.where('isFocused').equals(1).toArray();

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
      console.log(`[Klara] Cleared ${clearedCount} old focused tasks`);
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

  /**
   * Reorder MIT tasks by provided order (ids in desired order)
   */
  async reorderFocus(taskIdsInOrder: string[]): Promise<void> {
    await Promise.all(
      taskIdsInOrder.map((id, idx) =>
        db().tasks.update(id, {
          focusOrder: idx,
          updatedAt: now(),
        })
      )
    );
  },

  /**
   * Reset focus order to default (most recent focusedAt / createdAt first)
   */
  async resetFocusOrder(): Promise<void> {
    const focused = await this.getFocused();
    // Sort default: focusedAt desc, then createdAt desc
    const sorted = focused.sort((a, b) => {
      const aRef = a.focusedAt ?? a.createdAt;
      const bRef = b.focusedAt ?? b.createdAt;
      return bRef.localeCompare(aRef);
    });
    await Promise.all(
      sorted.map((task, idx) =>
        db().tasks.update(task.id, {
          focusOrder: idx,
          updatedAt: now(),
        })
      )
    );
  },

  /**
   * Reorder tasks within a quadrant by provided order (ids in desired order)
   */
  async reorderQuadrant(quadrant: QuadrantType, orderedIds: string[]): Promise<void> {
    // Ensure only tasks in quadrant are updated
    const quadrantTasks = await this.getByQuadrant(quadrant);
    const idSet = new Set(quadrantTasks.map(t => t.id));
    const filteredIds = orderedIds.filter(id => idSet.has(id));
    await Promise.all(
      filteredIds.map((id, idx) =>
        db().tasks.update(id, {
          quadrantOrder: idx,
          updatedAt: now(),
        })
      )
    );
  },

  /**
   * Reset quadrant order back to default: pinned first (pinnedAt/createdAt desc),
   * then others by createdAt desc.
   */
  async resetQuadrant(quadrant: QuadrantType): Promise<void> {
    const tasks = await this.getByQuadrant(quadrant);
    const pinned = tasks.filter(t => t.isPinned);
    const unpinned = tasks.filter(t => !t.isPinned);

    const sortPinned = [...pinned].sort((a, b) => {
      const aRef = a.pinnedAt ?? a.createdAt;
      const bRef = b.pinnedAt ?? b.createdAt;
      return bRef.localeCompare(aRef);
    });
    const sortUnpinned = [...unpinned].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    let idx = 0;
    await Promise.all(
      [...sortPinned, ...sortUnpinned].map(t =>
        db().tasks.update(t.id, {
          quadrantOrder: idx++,
          updatedAt: now(),
        })
      )
    );
  },
};
