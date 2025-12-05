'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Sun,
  Moon,
  Plus,
  Zap,
  Calendar,
  Clock,
  Coffee,
  Loader2,
} from 'lucide-react';
import QuadrantSection from './components/QuadrantSection';
import ReflectionView from './components/ReflectionView';
import TodaysFocus from './components/TodaysFocus';
import EmptyState from './components/EmptyState';
import AppHeader from './components/AppHeader';
import AppMenu from './components/AppMenu';
import { useToast } from './components/Toast';
import { useTasks, useUserPreferences, useStateInference } from '@/lib/hooks';
import { requestAISuggestions, shouldSuggestSubtasks } from '@/lib/services/aiClient';
import { detectAllNudges } from '@/lib/services/nudgeService';
import { motion, AnimatePresence } from 'motion/react';
import type { NudgeAction } from '@/types';

const KlaraApp = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('focus');
  const [inputText, setInputText] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Input Date State
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [inputDueDate, setInputDueDate] = useState<string | null>(null);
  const [showInputDatePicker, setShowInputDatePicker] = useState(false);
  const [isInputHidden, setIsInputHidden] = useState(false);

  // Input ref for focusing
  const inputRef = useRef<HTMLInputElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const lastScrollTopRef = useRef(0);

  // AI Online status (for now, always true - can be connected to actual API status later)
  const [isAIOnline] = useState(true);

  // Use IndexedDB-backed tasks
  const {
    tasks,
    incompleteTasks,
    focusedTasks,
    todayCompletedTasks,
    groupedTasks,
    isLoading,
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
    toggleShowSuggestions,
  } = useTasks();

  // User preferences for progressive disclosure and AI tone
  const { tasksCompletedCount, hasSeenReflectionIntro, incrementTasksCompleted, toneStyle } =
    useUserPreferences();

  // State inference for context-aware AI suggestions
  const { inferredState } = useStateInference(tasks);

  // Nudge detection - memoized to avoid recalculating on every render
  const nudgeMap = useMemo(() => {
    return detectAllNudges(incompleteTasks);
  }, [incompleteTasks]);

  // Nudge action handler
  const handleNudgeAction = useCallback(
    (taskId: string, action: NudgeAction) => {
      switch (action) {
        case 'set_new_date':
          // Expand the task to show date picker
          const task = tasks.find(t => t.id === taskId);
          if (task && !task.showSuggestions) {
            toggleShowSuggestions(taskId);
          }
          break;
        case 'break_down':
          // Request AI suggestions for this task
          const taskToBreak = tasks.find(t => t.id === taskId);
          if (taskToBreak) {
            setIsAiThinking(true);
            requestAISuggestions({
              taskText: taskToBreak.text,
              toneStyle,
              inferredState: inferredState?.state,
            }).then(async aiResult => {
              if (aiResult.success && aiResult.suggestions.length > 0) {
                await addAllSubTasks(taskId, aiResult.suggestions);
              }
              setIsAiThinking(false);
            });
          }
          break;
        case 'let_go':
          // Delete the task
          deleteTask(taskId);
          showToast('Task removed', 'info');
          break;
        case 'show_less':
          // TODO: Implement feedback learning (V1.5)
          showToast("Got it, we'll show fewer of these", 'info');
          break;
        case 'dismiss':
          // Just close the card (handled by component)
          break;
      }
    },
    [tasks, toneStyle, inferredState, toggleShowSuggestions, addAllSubTasks, deleteTask, showToast]
  );

  // Nudge dismiss handler
  const handleNudgeDismiss = useCallback((_taskId: string) => {
    // For now, just close the expanded view
    // In V1.5, we'll track dismissals for feedback learning
  }, []);

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

  // State for dismissing the reflection nudge
  const [reflectionNudgeDismissed, setReflectionNudgeDismissed] = useState(false);

  useEffect(() => {
    const container = mainScrollRef.current;
    if (!container) return;

    let ticking = false;
    const handleScroll = () => {
      const current = container.scrollTop;
      const delta = current - lastScrollTopRef.current;
      if (Math.abs(delta) > 20) {
        if (delta > 0 && current > 40) {
          setIsInputHidden(true);
        } else if (delta < 0 || current < 80) {
          setIsInputHidden(false);
        }
        lastScrollTopRef.current = current;
      }
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(handleScroll);
        ticking = true;
      }
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', onScroll);
    };
  }, [activeTab]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const lowerText = inputText.toLowerCase();
    let detectedImportance: 'high' | 'low' = 'low';
    let detectedUrgency: 'high' | 'low' = 'low';
    let autoDetectedDate = inputDueDate;

    // Keyword-based quadrant classification
    if (
      lowerText.includes('plan') ||
      lowerText.includes('strategy') ||
      lowerText.includes('launch') ||
      lowerText.includes('important')
    ) {
      detectedImportance = 'high';
    }
    if (
      lowerText.includes('now') ||
      lowerText.includes('asap') ||
      lowerText.includes('urgent') ||
      lowerText.includes('bill') ||
      lowerText.includes('deadline')
    ) {
      detectedUrgency = 'high';
    }
    if (
      lowerText.includes('movie') ||
      lowerText.includes('watch') ||
      lowerText.includes('game') ||
      lowerText.includes('someday')
    ) {
      detectedImportance = 'low';
      detectedUrgency = 'low';
    }

    // Date extraction from text
    if (!autoDetectedDate) {
      if (lowerText.includes('tomorrow')) {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        autoDetectedDate = d.toISOString().split('T')[0];
      } else if (lowerText.includes('today')) {
        autoDetectedDate = new Date().toISOString().split('T')[0];
      }
    }

    // Check if task should get AI suggestions
    const shouldGetSuggestions = shouldSuggestSubtasks(inputText);

    if (shouldGetSuggestions) {
      setIsAiThinking(true);
      const aiResult = await requestAISuggestions({
        taskText: inputText,
        toneStyle,
        inferredState: inferredState?.state,
      });

      await addTask(inputText, {
        importance: detectedImportance,
        urgency: detectedUrgency,
        dueDate: autoDetectedDate,
        aiSuggestions: aiResult.success ? aiResult.suggestions : [],
      });

      setIsAiThinking(false);
    } else {
      await addTask(inputText, {
        importance: detectedImportance,
        urgency: detectedUrgency,
        dueDate: autoDetectedDate,
      });
    }

    setInputText('');
    setInputDueDate(null);
  };

  const handleToggleTask = async (id: string) => {
    // Check if task is being completed (not uncompleted)
    const task = tasks.find(t => t.id === id);
    const isCompleting = task && !task.completed;

    await toggleTask(id);

    // Increment counter when completing a task
    if (isCompleting) {
      incrementTasksCompleted();
    }
  };

  const handleToggleSuggestions = (id: string) => {
    toggleShowSuggestions(id);
  };

  const handlePinTask = async (id: string) => {
    await togglePinned(id);
  };

  const handleDeleteTask = async (id: string) => {
    await deleteTask(id);
  };

  const handleUpdateDate = async (id: string, date: string | null) => {
    await updateDueDate(id, date);
  };

  const handleAddAllSuggestions = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task && task.aiSuggestions.length > 0) {
      await addAllSubTasks(taskId, task.aiSuggestions);
    }
  };

  const handleAddManualSubTask = async (taskId: string, text: string) => {
    await addSubTask(taskId, text);
  };

  const handleToggleSubTask = async (taskId: string, subTaskId: string) => {
    await toggleSubTask(taskId, subTaskId);
  };

  const handleDeleteSubTask = async (taskId: string, subTaskId: string) => {
    await deleteSubTask(taskId, subTaskId);
  };

  const handleToggleFocused = async (id: string) => {
    const result = await toggleFocused(id);
    if (!result.success && result.error) {
      showToast(result.error, 'info');
    }
  };

  // --- Drag and Drop Logic ---
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetQuadrant: string) => {
    e.preventDefault();
    if (!draggedTaskId) return;

    let importance: 'high' | 'low' = 'low';
    let urgency: 'high' | 'low' = 'low';

    switch (targetQuadrant) {
      case 'Do First':
        importance = 'high';
        urgency = 'high';
        break;
      case 'Schedule':
        importance = 'high';
        urgency = 'low';
        break;
      case 'Quick Tasks':
        importance = 'low';
        urgency = 'high';
        break;
      case 'Later':
        importance = 'low';
        urgency = 'low';
        break;
      default:
        return;
    }

    await updateQuadrant(draggedTaskId, importance, urgency);
    setDraggedTaskId(null);
  };

  // Quick Date Helpers for Input
  const setInputDateQuick = (
    type: 'today' | 'tomorrow' | 'this-weekend' | 'next-week' | 'custom',
    customDate?: string
  ) => {
    if (type === 'custom' && customDate) {
      setInputDueDate(customDate);
    } else {
      const d = new Date();
      if (type === 'tomorrow') d.setDate(d.getDate() + 1);
      if (type === 'this-weekend') {
        const day = d.getDay();
        const diff = day === 6 ? 7 : 6 - day;
        d.setDate(d.getDate() + diff);
      }
      if (type === 'next-week') {
        const day = d.getDay();
        const diff = day === 0 ? 1 : 8 - day;
        d.setDate(d.getDate() + diff);
      }
      setInputDueDate(d.toISOString().split('T')[0]);
    }
    setShowInputDatePicker(false);
  };

  // Focus input handler
  const focusInput = () => {
    inputRef.current?.focus();
  };

  // Auto-focus input on app load
  useEffect(() => {
    if (!isLoading && activeTab === 'focus') {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoading, activeTab]);

  // Handle click on Today's Focus task - scroll to it and expand
  const handleFocusTaskClick = (taskId: string) => {
    // Expand the task
    const task = tasks.find(t => t.id === taskId);
    if (task && !task.showSuggestions) {
      toggleShowSuggestions(taskId);
    }

    // Scroll to the task element
    setTimeout(() => {
      const element = document.getElementById(`task-${taskId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add a brief highlight effect
        element.classList.add('ring-2', 'ring-orange-300');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-orange-300');
        }, 1500);
      }
    }, 50);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFCF8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-stone-400">
          <Loader2 size={24} className="animate-spin" />
          <span className="text-sm">Loading your tasks...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-stone-700 font-sans selection:bg-orange-100">
      {/* App Menu (Side Panel) */}
      <AppMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      {/* Header */}
      <AppHeader onMenuOpen={() => setIsMenuOpen(true)} isAIOnline={isAIOnline} />

      <div className="max-w-md mx-auto min-h-screen flex flex-col bg-white/50 backdrop-blur-3xl shadow-[0_0_50px_-10px_rgba(0,0,0,0.02)]">
        {/* Scrollable Content Area - with padding for fixed header and footer */}
        <main
          ref={mainScrollRef}
          className={`flex-1 px-5 overflow-y-auto scrollbar-hide font-body pt-32 ${activeTab === 'focus' ? 'pb-48' : 'pb-24'}`}
          style={{ scrollPaddingBottom: activeTab === 'focus' ? '240px' : '100px' }}
        >
          {activeTab === 'focus' ? (
            <>
              {/* Today's Focus (MIT) */}
              <TodaysFocus
                tasks={focusedTasks}
                onToggleComplete={handleToggleTask}
                onRemoveFocus={handleToggleFocused}
                onTaskClick={handleFocusTaskClick}
              />

              {/* Progressive Disclosure: Reflection Nudge */}
              <AnimatePresence>
                {tasksCompletedCount >= 5 &&
                  !hasSeenReflectionIntro &&
                  !reflectionNudgeDismissed && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mb-4"
                    >
                      <div className="bg-linear-to-r from-orange-50 to-amber-50/50 border border-orange-100/50 rounded-xl px-4 py-3 flex items-center gap-3">
                        <Moon size={16} className="text-orange-400 shrink-0" />
                        <p className="text-[13px] text-stone-600 flex-1">
                          You&apos;ve been making good progress. Want to take a moment to reflect?
                        </p>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => setActiveTab('reflection')}
                            className="text-[12px] text-orange-500 hover:text-orange-600 font-medium"
                          >
                            Try it
                          </button>
                          <button
                            onClick={() => setReflectionNudgeDismissed(true)}
                            className="text-[12px] text-stone-400 hover:text-stone-500"
                          >
                            Later
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
              </AnimatePresence>

              {/* Empty State - shown when no incomplete tasks */}
              {incompleteTasks.length === 0 && (
                <EmptyState
                  onAddTask={focusInput}
                  hasCompletedTasks={todayCompletedTasks.length > 0}
                />
              )}

              {/* Matrix-based Task List with Drag & Drop */}
              <div className="space-y-5">
                <QuadrantSection
                  title="Do Now"
                  icon={<Zap size={12} className="text-rose-400" />}
                  tasks={groupedTasks['Do First']}
                  tag="act now"
                  quadrantId="Do First"
                  handleDrop={handleDrop}
                  handleDragOver={handleDragOver}
                  draggedTaskId={draggedTaskId}
                  toggleTask={handleToggleTask}
                  toggleSuggestions={handleToggleSuggestions}
                  handleDragStart={handleDragStart}
                  handleAddAllSuggestions={handleAddAllSuggestions}
                  handleAddManualSubTask={handleAddManualSubTask}
                  toggleSubTask={handleToggleSubTask}
                  deleteSubTask={handleDeleteSubTask}
                  handlePinTask={handlePinTask}
                  handleDeleteTask={handleDeleteTask}
                  handleUpdateDate={handleUpdateDate}
                  handleToggleFocused={handleToggleFocused}
                  handleEditTask={handleEditTask}
                  nudgeMap={nudgeMap}
                  onNudgeAction={handleNudgeAction}
                  onNudgeDismiss={handleNudgeDismiss}
                />

                <QuadrantSection
                  title="Plan & Focus"
                  icon={<Calendar size={12} className="text-emerald-500" />}
                  tasks={groupedTasks['Schedule']}
                  tag="plan ahead"
                  quadrantId="Schedule"
                  handleDrop={handleDrop}
                  handleDragOver={handleDragOver}
                  draggedTaskId={draggedTaskId}
                  toggleTask={handleToggleTask}
                  toggleSuggestions={handleToggleSuggestions}
                  handleDragStart={handleDragStart}
                  handleAddAllSuggestions={handleAddAllSuggestions}
                  handleAddManualSubTask={handleAddManualSubTask}
                  toggleSubTask={handleToggleSubTask}
                  deleteSubTask={handleDeleteSubTask}
                  handlePinTask={handlePinTask}
                  handleDeleteTask={handleDeleteTask}
                  handleUpdateDate={handleUpdateDate}
                  handleToggleFocused={handleToggleFocused}
                  handleEditTask={handleEditTask}
                  nudgeMap={nudgeMap}
                  onNudgeAction={handleNudgeAction}
                  onNudgeDismiss={handleNudgeDismiss}
                />

                <QuadrantSection
                  title="Quick Tasks"
                  icon={<Clock size={12} className="text-orange-400" />}
                  tasks={groupedTasks['Quick Tasks']}
                  tag="quick wins"
                  quadrantId="Quick Tasks"
                  handleDrop={handleDrop}
                  handleDragOver={handleDragOver}
                  draggedTaskId={draggedTaskId}
                  toggleTask={handleToggleTask}
                  toggleSuggestions={handleToggleSuggestions}
                  handleDragStart={handleDragStart}
                  handleAddAllSuggestions={handleAddAllSuggestions}
                  handleAddManualSubTask={handleAddManualSubTask}
                  toggleSubTask={handleToggleSubTask}
                  deleteSubTask={handleDeleteSubTask}
                  handlePinTask={handlePinTask}
                  handleDeleteTask={handleDeleteTask}
                  handleUpdateDate={handleUpdateDate}
                  handleToggleFocused={handleToggleFocused}
                  handleEditTask={handleEditTask}
                  nudgeMap={nudgeMap}
                  onNudgeAction={handleNudgeAction}
                  onNudgeDismiss={handleNudgeDismiss}
                />

                <QuadrantSection
                  title="For Later"
                  icon={<Coffee size={12} className="text-stone-400" />}
                  tasks={groupedTasks['Later']}
                  tag="someday"
                  quadrantId="Later"
                  isFaded={true}
                  handleDrop={handleDrop}
                  handleDragOver={handleDragOver}
                  draggedTaskId={draggedTaskId}
                  toggleTask={handleToggleTask}
                  toggleSuggestions={handleToggleSuggestions}
                  handleDragStart={handleDragStart}
                  handleAddAllSuggestions={handleAddAllSuggestions}
                  handleAddManualSubTask={handleAddManualSubTask}
                  toggleSubTask={handleToggleSubTask}
                  deleteSubTask={handleDeleteSubTask}
                  handlePinTask={handlePinTask}
                  handleDeleteTask={handleDeleteTask}
                  handleUpdateDate={handleUpdateDate}
                  handleToggleFocused={handleToggleFocused}
                  handleEditTask={handleEditTask}
                  nudgeMap={nudgeMap}
                  onNudgeAction={handleNudgeAction}
                  onNudgeDismiss={handleNudgeDismiss}
                />

                {/* Done Today - only show today's completed tasks */}
                {todayCompletedTasks.length > 0 && (
                  <section className="pt-4 opacity-40 hover:opacity-100 transition-opacity duration-500 mt-6 pb-8">
                    <h3 className="text-[11px] font-semibold text-stone-300 uppercase tracking-widest mb-2 pl-1 font-heading">
                      Done today ({todayCompletedTasks.length})
                    </h3>
                    <div className="space-y-2">
                      {todayCompletedTasks.slice(0, 5).map(task => (
                        <div key={task.id} className="flex items-center gap-3 pl-2 group py-1">
                          <button
                            onClick={() => handleToggleTask(task.id)}
                            className="text-stone-300 group-hover:text-stone-400 transition-colors"
                          >
                            <CheckCircle2 size={16} strokeWidth={1.5} />
                          </button>
                          <span className="text-stone-300 line-through decoration-stone-200 text-[14px] font-normal">
                            {task.text}
                          </span>
                        </div>
                      ))}
                      {todayCompletedTasks.length > 5 && (
                        <p className="text-[11px] text-stone-300 pl-2 mt-2">
                          +{todayCompletedTasks.length - 5} more
                        </p>
                      )}
                    </div>
                  </section>
                )}
              </div>
            </>
          ) : (
            /* --- REFLECTION TAB --- */
            <ReflectionView />
          )}
        </main>
      </div>

      {/* Fixed Bottom Input Area - Only show on Focus tab */}
      {activeTab === 'focus' && (
        <div
          className={`fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/95 backdrop-blur-xl border-t border-stone-100/50 px-5 py-4 z-20 rounded-t-3xl shadow-[0_-10px_40px_-20px_rgba(0,0,0,0.2)] transition-transform duration-300 ${isInputHidden ? 'translate-y-[140%]' : 'translate-y-0'}`}
        >
          <form onSubmit={handleAddTask} className="relative">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onFocus={() => {
                setIsInputFocused(true);
                setIsInputHidden(false);
              }}
              onBlur={() => {
                setTimeout(() => setIsInputFocused(false), 200);
              }}
              placeholder="What's on your mind?"
              className="w-full bg-transparent text-[16px] font-normal placeholder:text-stone-300 placeholder:font-light border-b border-stone-200 py-3 pr-16 focus:outline-none focus:border-orange-300 transition-colors font-body text-stone-700"
            />

            <div className="absolute right-0 top-3 flex items-center gap-3">
              {/* Date Trigger in Input */}
              {(isInputFocused || inputDueDate) && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowInputDatePicker(!showInputDatePicker)}
                    className={`transition-colors ${inputDueDate ? 'text-orange-400' : 'text-stone-300 hover:text-stone-500'}`}
                  >
                    <Calendar size={18} strokeWidth={inputDueDate ? 2 : 1.5} />
                  </button>

                  {/* Quick Input Date Picker Popover */}
                  {showInputDatePicker && (
                    <div className="absolute bottom-full right-0 mb-2 bg-white rounded-xl shadow-xl border border-stone-100 p-2 min-w-[140px] z-50 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-200">
                      <button
                        type="button"
                        onClick={() => setInputDateQuick('today')}
                        className="text-left px-3 py-2 text-[13px] text-stone-600 hover:bg-stone-50 rounded-lg transition-colors"
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => setInputDateQuick('tomorrow')}
                        className="text-left px-3 py-2 text-[13px] text-stone-600 hover:bg-stone-50 rounded-lg transition-colors"
                      >
                        Tomorrow
                      </button>
                      <button
                        type="button"
                        onClick={() => setInputDateQuick('this-weekend')}
                        className="text-left px-3 py-2 text-[13px] text-stone-600 hover:bg-stone-50 rounded-lg transition-colors"
                      >
                        This Weekend
                      </button>
                      <button
                        type="button"
                        onClick={() => setInputDateQuick('next-week')}
                        className="text-left px-3 py-2 text-[13px] text-stone-600 hover:bg-stone-50 rounded-lg transition-colors"
                      >
                        Next Week
                      </button>

                      <div className="h-px bg-stone-100 my-0.5"></div>

                      <div className="relative">
                        <input
                          type="date"
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                          onChange={e => setInputDateQuick('custom', e.target.value)}
                        />
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 text-[13px] text-stone-600 hover:bg-stone-50 rounded-lg transition-colors flex justify-between items-center"
                        >
                          <span>Pick Date...</span>
                          <Calendar size={10} className="opacity-50" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                className={`text-stone-300 hover:text-orange-400 transition-colors ${inputText ? 'opacity-100' : 'opacity-0'}`}
              >
                <Plus size={22} strokeWidth={2} />
              </button>
            </div>
          </form>

          {/* Input hints */}
          <div className="mt-2 text-[13px] text-stone-300 flex flex-wrap gap-2 font-light items-center min-h-[20px]">
            {isAiThinking ? (
              <div className="flex items-center gap-1.5 animate-pulse text-stone-400">
                <Sparkles size={12} className="text-orange-400" />
                <span className="font-medium tracking-wide">Decomposing task...</span>
              </div>
            ) : (
              <>
                {inputDueDate && (
                  <span className="text-orange-400 bg-orange-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(inputDueDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                    <button
                      onClick={() => setInputDueDate(null)}
                      className="hover:text-orange-600 ml-1"
                    >
                      ×
                    </button>
                  </span>
                )}
                {!inputText && !inputDueDate && (
                  <>
                    <span className="mr-0.5">Try:</span>
                    <button
                      onClick={() => setInputText('Plan a 3-day trip to Kyoto')}
                      className="hover:text-stone-500 transition-colors border-b border-stone-100 hover:border-stone-300 pb-0.5"
                    >
                      &ldquo;Plan trip to Kyoto&rdquo;
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/90 backdrop-blur-xl border-t border-stone-100/50 pt-4 pb-4 px-10 flex justify-center gap-24 items-center text-[12px] font-bold tracking-widest text-stone-300 uppercase font-heading z-20"
        style={{ paddingBottom: 'calc(1.5rem + var(--safe-area-inset-bottom))' }}
      >
        <button
          onClick={() => setActiveTab('focus')}
          className={`flex flex-col items-center gap-1.5 transition-colors duration-300 ${activeTab === 'focus' ? 'text-stone-800' : 'hover:text-stone-500'}`}
        >
          <Sun
            size={18}
            strokeWidth={2}
            className={activeTab === 'focus' ? 'text-orange-400' : ''}
          />
          <span>Focus</span>
        </button>

        <button
          onClick={() => setActiveTab('reflection')}
          className={`flex flex-col items-center gap-1.5 transition-colors duration-300 ${activeTab === 'reflection' ? 'text-stone-800' : 'hover:text-stone-500'}`}
        >
          <Moon
            size={18}
            strokeWidth={2}
            className={activeTab === 'reflection' ? 'text-orange-400' : ''}
          />
          <span>Reflection</span>
        </button>
      </nav>
    </div>
  );
};

export default KlaraApp;
