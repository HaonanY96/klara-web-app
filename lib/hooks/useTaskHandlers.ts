import { useCallback } from 'react';
import type {
  TaskWithDetails,
  NudgeAction,
  ToneStyle,
  InferredStateType,
  NudgeType,
} from '@/types';
import { requestAISuggestions } from '@/lib/services/aiClient';
import { setNudgeCooldown } from '@/lib/services/nudgeService';
import { buildTaskSignature } from '@/lib/utils';

interface UseTaskHandlersOptions {
  tasks: TaskWithDetails[];
  toneStyle: ToneStyle;
  inferredState: InferredStateType | undefined;
  toggleTask: (id: string) => Promise<void>;
  togglePinned: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  updateDueDate: (id: string, date: string | null) => Promise<void>;
  updateTaskText: (id: string, text: string) => Promise<void>;
  addSubTask: (taskId: string, text: string) => Promise<void>;
  addAllSubTasks: (taskId: string, texts: string[]) => Promise<void>;
  toggleSubTask: (taskId: string, subTaskId: string) => Promise<void>;
  deleteSubTask: (taskId: string, subTaskId: string) => Promise<void>;
  toggleFocused: (id: string) => Promise<{ success: boolean; error?: string }>;
  dismissAISuggestions: (taskId: string) => Promise<void>;
  incrementTasksCompleted: () => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  toggleTaskExpansion: (id: string, force?: boolean) => void;
  setIsAiThinking: (thinking: boolean) => void;
}

interface UseTaskHandlersReturn {
  handleToggleTask: (id: string) => Promise<void>;
  handlePinTask: (id: string) => Promise<void>;
  handleDeleteTask: (id: string) => Promise<void>;
  handleUpdateDate: (id: string, date: string | null) => Promise<void>;
  handleEditTask: (taskId: string) => Promise<void>;
  handleAddAllSuggestions: (taskId: string) => Promise<void>;
  handleDismissSuggestions: (taskId: string) => Promise<void>;
  handleAddManualSubTask: (taskId: string, text: string) => Promise<void>;
  handleToggleSubTask: (taskId: string, subTaskId: string) => Promise<void>;
  handleDeleteSubTask: (taskId: string, subTaskId: string) => Promise<void>;
  handleToggleFocused: (id: string) => Promise<void>;
  handleNudgeAction: (taskId: string, action: NudgeAction) => void;
  handleNudgeDismiss: (taskId: string, type: NudgeType) => void;
  handleFocusTaskClick: (taskId: string) => void;
}

/**
 * Hook for managing all task-related event handlers
 */
export function useTaskHandlers(options: UseTaskHandlersOptions): UseTaskHandlersReturn {
  const {
    tasks,
    toneStyle,
    inferredState,
    toggleTask,
    togglePinned,
    deleteTask,
    updateDueDate,
    updateTaskText,
    addSubTask,
    addAllSubTasks,
    toggleSubTask,
    deleteSubTask,
    toggleFocused,
    dismissAISuggestions,
    incrementTasksCompleted,
    showToast,
    toggleTaskExpansion,
    setIsAiThinking,
  } = options;

  const handleToggleTask = useCallback(
    async (id: string) => {
      const task = tasks.find(t => t.id === id);
      const isCompleting = task && !task.completed;

      await toggleTask(id);

      if (isCompleting) {
        incrementTasksCompleted();
      }
    },
    [tasks, toggleTask, incrementTasksCompleted]
  );

  const handlePinTask = useCallback(
    async (id: string) => {
      await togglePinned(id);
    },
    [togglePinned]
  );

  const handleDeleteTask = useCallback(
    async (id: string) => {
      await deleteTask(id);
    },
    [deleteTask]
  );

  const handleUpdateDate = useCallback(
    async (id: string, date: string | null) => {
      await updateDueDate(id, date);
    },
    [updateDueDate]
  );

  const handleEditTask = useCallback(
    async (taskId: string) => {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      const nextText = window.prompt('Edit task', task.text);
      if (nextText === null) return;
      const trimmed = nextText.trim();
      if (!trimmed || trimmed === task.text) return;
      await updateTaskText(taskId, trimmed);
    },
    [tasks, updateTaskText]
  );

  const handleAddAllSuggestions = useCallback(
    async (taskId: string) => {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.aiSuggestions.length > 0) {
        await addAllSubTasks(taskId, task.aiSuggestions);
      }
    },
    [tasks, addAllSubTasks]
  );

  const handleDismissSuggestions = useCallback(
    async (taskId: string) => {
      await dismissAISuggestions(taskId);
      toggleTaskExpansion(taskId, false);
      showToast('Suggestions dismissed', 'info');
    },
    [dismissAISuggestions, toggleTaskExpansion, showToast]
  );

  const handleAddManualSubTask = useCallback(
    async (taskId: string, text: string) => {
      await addSubTask(taskId, text);
    },
    [addSubTask]
  );

  const handleToggleSubTask = useCallback(
    async (taskId: string, subTaskId: string) => {
      await toggleSubTask(taskId, subTaskId);
    },
    [toggleSubTask]
  );

  const handleDeleteSubTask = useCallback(
    async (taskId: string, subTaskId: string) => {
      await deleteSubTask(taskId, subTaskId);
    },
    [deleteSubTask]
  );

  const handleToggleFocused = useCallback(
    async (id: string) => {
      const result = await toggleFocused(id);
      if (!result.success && result.error) {
        showToast(result.error, 'info');
      }
    },
    [toggleFocused, showToast]
  );

  const handleNudgeAction = useCallback(
    (taskId: string, action: NudgeAction) => {
      switch (action) {
        case 'set_new_date': {
          const task = tasks.find(t => t.id === taskId);
          if (task) {
            toggleTaskExpansion(taskId, true);
          }
          break;
        }
        case 'break_down': {
          const taskToBreak = tasks.find(t => t.id === taskId);
          if (taskToBreak) {
            setIsAiThinking(true);
            requestAISuggestions({
              taskText: taskToBreak.text,
              toneStyle,
              inferredState,
              taskId,
              taskSignature: buildTaskSignature({
                text: taskToBreak.text,
                importance: taskToBreak.importance,
                urgency: taskToBreak.urgency,
                dueDate: taskToBreak.dueDate,
              }),
            }).then(async aiResult => {
              if (aiResult.success && aiResult.suggestions.length > 0) {
                await addAllSubTasks(taskId, aiResult.suggestions);
                toggleTaskExpansion(taskId, true);
                if (aiResult.fromCache) {
                  showToast('Used cached AI suggestions.', 'info');
                }
              } else if (aiResult.rateLimited) {
                showToast(aiResult.error || 'AI request is rate limited.', 'info');
              } else {
                showToast(aiResult.error || 'AI request failed.', 'error');
              }
              setIsAiThinking(false);
            });
          }
          break;
        }
        case 'let_go':
          deleteTask(taskId);
          showToast('Task removed', 'info');
          break;
        case 'show_less':
          showToast("Got it, we'll show fewer of these", 'info');
          break;
        case 'dismiss':
          // Just close the card (handled by component)
          break;
      }
    },
    [
      tasks,
      toneStyle,
      inferredState,
      addAllSubTasks,
      deleteTask,
      showToast,
      toggleTaskExpansion,
      setIsAiThinking,
    ]
  );

  const handleNudgeDismiss = useCallback((taskId: string, type: NudgeType) => {
    setNudgeCooldown(taskId, type);
  }, []);

  const handleFocusTaskClick = useCallback(
    (taskId: string) => {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        toggleTaskExpansion(taskId, true);
      }

      setTimeout(() => {
        const element = document.getElementById(`task-${taskId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-2', 'ring-orange-300');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-orange-300');
          }, 1500);
        }
      }, 50);
    },
    [tasks, toggleTaskExpansion]
  );

  return {
    handleToggleTask,
    handlePinTask,
    handleDeleteTask,
    handleUpdateDate,
    handleEditTask,
    handleAddAllSuggestions,
    handleDismissSuggestions,
    handleAddManualSubTask,
    handleToggleSubTask,
    handleDeleteSubTask,
    handleToggleFocused,
    handleNudgeAction,
    handleNudgeDismiss,
    handleFocusTaskClick,
  };
}

