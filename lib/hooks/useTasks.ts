'use client';

/**
 * useTasks Hook
 *
 * React hook for managing tasks with IndexedDB persistence.
 * Provides all task operations with automatic state sync.
 */

import { useState, useEffect, useCallback } from 'react';
import { taskRepository, subTaskRepository } from '@/lib/db/repositories';
import { isFirstLaunch, markOnboarded, createSeedTasks } from '@/lib/db/seedData';
import type { TaskWithDetails, CreateTask, QuadrantType } from '@/types';
import { getQuadrant } from '@/types';

interface UseTasksReturn {
  // Data
  tasks: TaskWithDetails[];
  incompleteTasks: TaskWithDetails[];
  focusedTasks: TaskWithDetails[];
  completedTasks: TaskWithDetails[];
  todayCompletedTasks: TaskWithDetails[];
  groupedTasks: Record<QuadrantType, TaskWithDetails[]>;

  // State
  isLoading: boolean;
  error: string | null;

  // Task Operations
  addTask: (
    text: string,
    options?: {
      importance?: 'high' | 'low';
      urgency?: 'high' | 'low';
      dueDate?: string | null;
      aiSuggestions?: string[];
    }
  ) => Promise<TaskWithDetails>;
  toggleTask: (id: string) => Promise<void>;
  togglePinned: (id: string) => Promise<void>;
  toggleFocused: (id: string) => Promise<{ success: boolean; error?: string }>;
  updateQuadrant: (
    id: string,
    importance: 'high' | 'low',
    urgency: 'high' | 'low'
  ) => Promise<void>;
  updateDueDate: (id: string, dueDate: string | null) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  updateTaskText: (id: string, text: string) => Promise<void>;

  // SubTask Operations
  addSubTask: (taskId: string, text: string) => Promise<void>;
  addAllSubTasks: (taskId: string, texts: string[]) => Promise<void>;
  toggleSubTask: (taskId: string, subTaskId: string) => Promise<void>;
  deleteSubTask: (taskId: string, subTaskId: string) => Promise<void>;
  dismissAISuggestions: (taskId: string) => Promise<void>;

  // Refresh
  refresh: () => Promise<void>;
}

export function useTasks(): UseTasksReturn {
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load tasks from IndexedDB
  const loadTasks = useCallback(async () => {
    try {
      setError(null);
      const allTasks = await taskRepository.getAllWithDetails();
      setTasks(allTasks);
    } catch (err) {
      console.error('[useTasks] Failed to load tasks:', err);
      setError('Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load + clear old focus + seed data for first launch
  useEffect(() => {
    const init = async () => {
      // Clear yesterday's focus
      await taskRepository.clearOldFocus();

      // Check if first launch and seed educational tasks
      if (isFirstLaunch()) {
        const { tasks: seedTasksData, subTasks: seedSubTasks } = createSeedTasks();

        // Insert seed tasks
        for (const task of seedTasksData) {
          await taskRepository.create(
            {
              text: task.text,
              completed: task.completed,
              importance: task.importance,
              urgency: task.urgency,
              isPinned: task.isPinned,
              isFocused: task.isFocused,
              dueDate: task.dueDate,
            },
            task.id,
            task.aiSuggestions,
            task.showSuggestions
          );
        }

        // Insert seed subtasks
        for (const subTask of seedSubTasks) {
          await subTaskRepository.create(
            {
              taskId: subTask.taskId,
              text: subTask.text,
              completed: subTask.completed,
              isAISuggested: false,
              order: 0,
            },
            subTask.id
          );
        }

        markOnboarded();
      }

      await loadTasks();
    };
    init();
  }, [loadTasks]);

  // Computed values
  const incompleteTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  // Today's completed tasks (for Done section)
  const today = new Date().toISOString().split('T')[0];
  const todayCompletedTasks = completedTasks.filter(
    t => t.completedAt && t.completedAt.startsWith(today)
  );

  const focusedTasks = incompleteTasks.filter(t => t.isFocused);

  const groupedTasks: Record<QuadrantType, TaskWithDetails[]> = {
    'Do First': incompleteTasks.filter(t => getQuadrant(t) === 'Do First'),
    Schedule: incompleteTasks.filter(t => getQuadrant(t) === 'Schedule'),
    'Quick Tasks': incompleteTasks.filter(t => getQuadrant(t) === 'Quick Tasks'),
    Later: incompleteTasks.filter(t => getQuadrant(t) === 'Later'),
  };

  // Task Operations
  const addTask = useCallback(
    async (
      text: string,
      options?: {
        importance?: 'high' | 'low';
        urgency?: 'high' | 'low';
        dueDate?: string | null;
        aiSuggestions?: string[];
      }
    ): Promise<TaskWithDetails> => {
      const createData: CreateTask = {
        text,
        completed: false,
        importance: options?.importance ?? 'low',
        urgency: options?.urgency ?? 'low',
        dueDate: options?.dueDate ?? null,
        isPinned: false,
        isFocused: false,
      };

      const task = await taskRepository.create(createData);

      const taskWithDetails: TaskWithDetails = {
        ...task,
        subTasks: [],
        aiSuggestions: options?.aiSuggestions ?? [],
        showSuggestions: (options?.aiSuggestions?.length ?? 0) > 0,
      };

      setTasks(prev => [taskWithDetails, ...prev]);
      return taskWithDetails;
    },
    []
  );

  const toggleTask = useCallback(
    async (id: string) => {
      await taskRepository.toggleComplete(id);
      await loadTasks();
    },
    [loadTasks]
  );

  const togglePinned = useCallback(
    async (id: string) => {
      await taskRepository.togglePinned(id);
      await loadTasks();
    },
    [loadTasks]
  );

  const toggleFocused = useCallback(
    async (id: string): Promise<{ success: boolean; error?: string }> => {
      const result = await taskRepository.toggleFocused(id);
      if (result.success) {
        await loadTasks();
      }
      return result;
    },
    [loadTasks]
  );

  const updateQuadrant = useCallback(
    async (id: string, importance: 'high' | 'low', urgency: 'high' | 'low') => {
      await taskRepository.updateQuadrant(id, importance, urgency);
      await loadTasks();
    },
    [loadTasks]
  );

  const updateDueDate = useCallback(
    async (id: string, dueDate: string | null) => {
      await taskRepository.updateDueDate(id, dueDate);
      await loadTasks();
    },
    [loadTasks]
  );

  const deleteTask = useCallback(async (id: string) => {
    await taskRepository.delete(id);
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const updateTaskText = useCallback(
    async (id: string, text: string) => {
      await taskRepository.update({ id, text });
      await loadTasks();
    },
    [loadTasks]
  );

  // SubTask Operations
  const addSubTask = useCallback(
    async (taskId: string, text: string) => {
      await subTaskRepository.create({
        taskId,
        text,
        completed: false,
        isAISuggested: false,
        order: 0, // Will be auto-set by repository
      });
      await loadTasks();
    },
    [loadTasks]
  );

  const addAllSubTasks = useCallback(
    async (taskId: string, texts: string[]) => {
      await subTaskRepository.createMany(taskId, texts, true);
      await taskRepository.markSuggestionsConsumed(taskId);
      // Clear AI suggestions from local state
      setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, aiSuggestions: [] } : t)));
      await loadTasks();
    },
    [loadTasks]
  );

  const toggleSubTask = useCallback(
    async (taskId: string, subTaskId: string) => {
      await subTaskRepository.toggleComplete(subTaskId);
      await loadTasks();
    },
    [loadTasks]
  );

  const deleteSubTask = useCallback(
    async (taskId: string, subTaskId: string) => {
      await subTaskRepository.delete(subTaskId);
      await loadTasks();
    },
    [loadTasks]
  );

  const dismissAISuggestions = useCallback(
    async (taskId: string) => {
      await taskRepository.clearAISuggestions(taskId);
      setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, aiSuggestions: [] } : t)));
      await loadTasks();
    },
    [loadTasks]
  );

  return {
    tasks,
    incompleteTasks,
    focusedTasks,
    completedTasks,
    todayCompletedTasks,
    groupedTasks,
    isLoading,
    error,
    addTask,
    toggleTask,
    togglePinned,
    toggleFocused,
    updateQuadrant,
    updateDueDate,
    deleteTask,
    updateTaskText,
    addSubTask,
    addAllSubTasks,
    toggleSubTask,
    deleteSubTask,
    dismissAISuggestions,
    refresh: loadTasks,
  };
}
