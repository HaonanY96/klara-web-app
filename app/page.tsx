'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Sparkles,
  CheckCircle2,
  Sun,
  Moon,
  Plus,
  Send,
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
import BottomNavigation from './components/BottomNavigation';
import CompletedTasksList from './components/CompletedTasksList';
import ReflectionNudge from './components/ReflectionNudge';
import { useToast } from './components/Toast';
import {
  useTasks,
  useUserPreferences,
  useStateInference,
  useIsDesktop,
  useDragAndDrop,
  useScrollHiding,
  useTaskHandlers,
} from '@/lib/hooks';
import { requestAISuggestions, shouldSuggestSubtasks } from '@/lib/services/aiClient';
import { detectAllNudges } from '@/lib/services/nudgeService';
import { classifyTask } from '@/lib/utils/taskClassification';
import { buildTaskSignature } from '@/lib/utils/taskSignature';
import { motion, AnimatePresence } from 'motion/react';
import type { NudgeAction, TaskWithDetails, QuadrantType } from '@/types';
import { DatePickerPopover } from './components/DatePickerPopover';
import { parseLocalDate } from '@/lib/utils/date';

const KlaraApp = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('focus');
  const [inputText, setInputText] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Input Date State
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [inputDueDate, setInputDueDate] = useState<string | null>(null);
  const [showInputDatePicker, setShowInputDatePicker] = useState(false);
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(() => new Set());

  // Input ref for focusing
  const inputRef = useRef<HTMLInputElement>(null);
  const quickDateButtonRef = useRef<HTMLButtonElement | null>(null);
  const isDesktop = useIsDesktop();

  // Scroll hiding for input bar
  const { isHidden: isInputHidden, scrollRef: mainScrollRef, setIsHidden: setIsInputHidden } = useScrollHiding({ activeTab });

  const toggleTaskExpansion = useCallback((id: string, force?: boolean) => {
    setExpandedTaskIds(prev => {
      const next = new Set(prev);
      const shouldExpand = force !== undefined ? force : !next.has(id);
      if (shouldExpand) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

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
    dismissAISuggestions,
    reorderFocus,
    resetFocusOrder,
    reorderQuadrant,
    resetQuadrant,
  } = useTasks();

  const effectiveExpandedTaskIds = useMemo(() => {
    const next = new Set<string>();
    const currentIds = new Set(tasks.map(t => t.id));

    // keep only existing tasks
    expandedTaskIds.forEach(id => {
      if (currentIds.has(id)) next.add(id);
    });

    // auto-expand tasks that should show suggestions
    tasks.forEach(task => {
      if (task.showSuggestions) next.add(task.id);
    });

    return next;
  }, [expandedTaskIds, tasks]);

  const isTaskExpanded = useCallback(
    (id: string) => effectiveExpandedTaskIds.has(id),
    [effectiveExpandedTaskIds]
  );

  // User preferences for progressive disclosure and AI tone
  const {
    tasksCompletedCount,
    hasSeenReflectionIntro,
    incrementTasksCompleted,
    toneStyle,
    enableQuadrantOrdering,
  } = useUserPreferences();

  // State inference for context-aware AI suggestions
  const { inferredState, stateDescription, isInferring, refresh: refreshState } = useStateInference(tasks);
  const stateLabel = inferredState ? stateDescription || 'Neutral' : undefined;

  // Drag and drop
  const { draggedTaskId, handleDragStart, handleDragOver, handleDrop: handleDropBase } = useDragAndDrop();

  // Task handlers
  const taskHandlers = useTaskHandlers({
    tasks,
    toneStyle,
    inferredState: inferredState?.state,
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
  });

  const {
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
  } = taskHandlers;

  // Nudge detection - memoized to avoid recalculating on every render
  const nudgeMap = useMemo(() => {
    return detectAllNudges(incompleteTasks);
  }, [incompleteTasks]);

  // Close quick date picker when tapping outside (Now handled by DatePickerPopover)
  // but we still want to close if clicking completely outside the popover's concern if needed
  // actually, DatePickerPopover handles its own close. We just need to pass onClose.



  // State for dismissing the reflection nudge
  const [reflectionNudgeDismissed, setReflectionNudgeDismissed] = useState(false);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    // Classify task using centralized classification logic
    const classification = classifyTask(inputText, inputDueDate);
    const { importance: detectedImportance, urgency: detectedUrgency, detectedDate: autoDetectedDate } = classification;

    let createdTask: TaskWithDetails | null = null;

    // Check if task should get AI suggestions
    const shouldGetSuggestions = shouldSuggestSubtasks(inputText);

    if (shouldGetSuggestions) {
      setIsAiThinking(true);
      const aiResult = await requestAISuggestions({
        taskText: inputText,
        toneStyle,
        inferredState: inferredState?.state,
        taskSignature: buildTaskSignature({
          text: inputText,
          importance: detectedImportance,
          urgency: detectedUrgency,
          dueDate: autoDetectedDate,
        }),
      });

      createdTask = await addTask(inputText, {
        importance: detectedImportance,
        urgency: detectedUrgency,
        dueDate: autoDetectedDate,
        aiSuggestions: aiResult.success ? aiResult.suggestions : [],
      });

      setIsAiThinking(false);
    } else {
      createdTask = await addTask(inputText, {
        importance: detectedImportance,
        urgency: detectedUrgency,
        dueDate: autoDetectedDate,
      });
    }

    if (createdTask?.aiSuggestions.length) {
      toggleTaskExpansion(createdTask.id, true);
    }

    setInputText('');
    setInputDueDate(null);
  };


  // Wrap handleDrop with updateQuadrant dependency
  const handleDrop = useCallback(
    (e: React.DragEvent, targetQuadrant: string) => {
      handleDropBase(e, targetQuadrant, updateQuadrant);
    },
    [handleDropBase, updateQuadrant]
  );

  // Quick Date Helpers for Input - simplified now that DatePickerPopover handles logic
  const handleInputDateSelect = (dateStr: string | null) => {
    setInputDueDate(dateStr);
    setShowInputDatePicker(false);
    // Refocus input after selection
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleReorderFocus = async (orderedIds: string[]) => {
    await reorderFocus(orderedIds);
  };

  const handleResetFocus = async () => {
    await resetFocusOrder();
  };

  const handleReorderQuadrant = async (
    quadrantId: QuadrantType,
    pinnedIds: string[],
    unpinnedIds: string[]
  ) => {
    await reorderQuadrant(quadrantId, [...pinnedIds, ...unpinnedIds]);
  };

  const handleResetQuadrantOrder = async (quadrantId: QuadrantType) => {
    await resetQuadrant(quadrantId);
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
      <AppMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onRefreshState={refreshState}
        isInferringState={isInferring}
      />

      {/* Header */}
      <AppHeader
        onMenuOpen={() => setIsMenuOpen(true)}
        isAIOnline={isAIOnline}
        stateLabel={stateLabel}
        isAppLoading={isLoading}
      />

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
                onReorder={handleReorderFocus}
                onResetOrder={handleResetFocus}
              />

              {/* Progressive Disclosure: Reflection Nudge */}
              <ReflectionNudge
                show={tasksCompletedCount >= 5 && !hasSeenReflectionIntro && !reflectionNudgeDismissed}
                onTryIt={() => setActiveTab('reflection')}
                onDismiss={() => setReflectionNudgeDismissed(true)}
              />

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
                  handleDismissSuggestions={handleDismissSuggestions}
                  isTaskExpanded={isTaskExpanded}
                  onToggleTaskExpanded={toggleTaskExpansion}
                  nudgeMap={nudgeMap}
                  onNudgeAction={handleNudgeAction}
                  onNudgeDismiss={handleNudgeDismiss}
                  orderingEnabled={enableQuadrantOrdering}
                  onReorder={handleReorderQuadrant}
                  onResetOrder={handleResetQuadrantOrder}
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
                  handleDismissSuggestions={handleDismissSuggestions}
                  isTaskExpanded={isTaskExpanded}
                  onToggleTaskExpanded={toggleTaskExpansion}
                  nudgeMap={nudgeMap}
                  onNudgeAction={handleNudgeAction}
                  onNudgeDismiss={handleNudgeDismiss}
                  orderingEnabled={enableQuadrantOrdering}
                  onReorder={handleReorderQuadrant}
                  onResetOrder={handleResetQuadrantOrder}
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
                  handleDismissSuggestions={handleDismissSuggestions}
                  isTaskExpanded={isTaskExpanded}
                  onToggleTaskExpanded={toggleTaskExpansion}
                  nudgeMap={nudgeMap}
                  onNudgeAction={handleNudgeAction}
                  onNudgeDismiss={handleNudgeDismiss}
                  orderingEnabled={enableQuadrantOrdering}
                  onReorder={handleReorderQuadrant}
                  onResetOrder={handleResetQuadrantOrder}
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
                  handleDismissSuggestions={handleDismissSuggestions}
                  isTaskExpanded={isTaskExpanded}
                  onToggleTaskExpanded={toggleTaskExpansion}
                  nudgeMap={nudgeMap}
                  onNudgeAction={handleNudgeAction}
                  onNudgeDismiss={handleNudgeDismiss}
                  orderingEnabled={enableQuadrantOrdering}
                  onReorder={handleReorderQuadrant}
                  onResetOrder={handleResetQuadrantOrder}
                />

                {/* Completed Tasks */}
                <CompletedTasksList
                  tasks={todayCompletedTasks}
                  onToggleTask={handleToggleTask}
                />
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
              {(isInputFocused || inputDueDate || showInputDatePicker) && (
                <div className="relative">
                  <button
                    ref={quickDateButtonRef}
                    type="button"
                    onClick={() => {
                      setShowInputDatePicker(prev => !prev);
                      inputRef.current?.focus();
                    }}
                    className={`flex items-center justify-center w-5 h-5 transition-colors ${inputDueDate ? 'text-orange-400' : 'text-stone-300 hover:text-stone-500'}`}
                  >
                    <Calendar size={20} strokeWidth={2} />
                  </button>

                  {/* Quick Input Date Picker Popover */}
                  {showInputDatePicker && (
                    <div className="absolute bottom-full right-0 mb-2 z-50">
                      <DatePickerPopover
                        selectedDate={inputDueDate}
                        onSelect={handleInputDateSelect}
                        onClose={() => setShowInputDatePicker(false)}
                        triggerRef={quickDateButtonRef}
                      />
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                className={`flex items-center justify-center w-5 h-5 transition-colors ${inputText ? 'text-orange-400 hover:text-orange-500' : 'text-stone-300 opacity-0'}`}
                style={{ transform: 'translateY(1px)' }}
              >
                <Send size={20} strokeWidth={2} />
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
                    {parseLocalDate(inputDueDate).toLocaleDateString('en-US', {
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

      {/* Bottom Navigation */}
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default KlaraApp;
