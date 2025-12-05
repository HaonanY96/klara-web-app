import React, { useState, useRef, useEffect } from 'react';
import {
  Circle,
  CheckCircle2,
  X,
  Sparkles,
  GripVertical,
  CornerDownRight,
  Plus,
  Calendar,
  Pin,
  Trash2,
  Star,
} from 'lucide-react';
import { formatDueDate, isOverdue, getNextWeekday, toDateString } from '@/lib/utils/date';
import { addDays } from 'date-fns';
import type { TaskWithDetails, TaskNudge, NudgeAction } from '@/types';
import TaskBadge from './TaskBadge';
import NudgeCard from './NudgeCard';
import { createPortal } from 'react-dom';
import TaskContextMenu from './TaskContextMenu';

interface TaskItemProps {
  task: TaskWithDetails;
  toggleTask: (id: string) => void;
  handleDragStart: (e: React.DragEvent, id: string) => void;
  handleAddAllSuggestions: (id: string) => void;
  handleAddManualSubTask: (id: string, text: string) => void;
  toggleSubTask: (taskId: string, subTaskId: string) => void;
  deleteSubTask: (taskId: string, subTaskId: string) => void;
  handlePinTask: (id: string) => void;
  handleDeleteTask: (id: string) => void;
  handleUpdateDate: (id: string, date: string | null) => void;
  handleToggleFocused?: (id: string) => void;
  handleEditTask?: (id: string) => void;
  /** Expanded state for subtasks/suggestions */
  isExpanded: boolean;
  /** Handler to toggle expanded state */
  onToggleExpanded: (id: string) => void;
  /** Active nudges for this task */
  nudges?: TaskNudge[];
  /** Handler for nudge actions */
  onNudgeAction?: (taskId: string, action: NudgeAction) => void;
  /** Handler for nudge dismiss */
  onNudgeDismiss?: (taskId: string) => void;
}

const TaskItem = ({
  task,
  toggleTask,
  handleDragStart,
  handleAddAllSuggestions,
  handleAddManualSubTask,
  toggleSubTask,
  deleteSubTask,
  handlePinTask,
  handleDeleteTask,
  handleUpdateDate,
  handleToggleFocused,
  handleEditTask,
  isExpanded,
  onToggleExpanded,
  nudges = [],
  onNudgeAction,
  onNudgeDismiss,
}: TaskItemProps) => {
  const [manualInput, setManualInput] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerPosition, setDatePickerPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  // Swipe Logic State
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const touchStartX = useRef<number | null>(null);

  // Long Press State
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);
  const dateButtonRef = useRef<HTMLButtonElement | null>(null);
  const datePickerContentRef = useRef<HTMLDivElement | null>(null);
  // Debounce ref to prevent immediate close on mobile touch
  const datePickerOpenTimeRef = useRef<number>(0);

  const SWIPE_THRESHOLD = 100;
  const LONG_PRESS_DURATION = 500; // ms

  const submitManualSubTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    handleAddManualSubTask(task.id, manualInput);
    setManualInput('');
  };

  // Calculate completion percentage
  const totalSub = task.subTasks.length;
  const completedSub = task.subTasks.filter(t => t.completed).length;
  const progress = totalSub > 0 ? Math.round((completedSub / totalSub) * 100) : 0;

  // Date quick set handler
  const setDateQuick = (
    type: 'today' | 'tomorrow' | 'this-weekend' | 'next-week' | 'custom' | 'clear',
    customDate?: string
  ) => {
    if (type === 'clear') {
      handleUpdateDate(task.id, null);
    } else if (type === 'custom' && customDate) {
      handleUpdateDate(task.id, customDate);
    } else {
      let date: Date;
      const today = new Date();

      switch (type) {
        case 'today':
          date = today;
          break;
        case 'tomorrow':
          date = addDays(today, 1);
          break;
        case 'this-weekend':
          date = getNextWeekday(6); // Saturday
          break;
        case 'next-week':
          date = getNextWeekday(1); // Monday
          break;
        default:
          date = today;
      }

      handleUpdateDate(task.id, toDateString(date));
    }
    closeDatePicker(true); // Force close after selection
  };

  const closeDatePicker = (force = false) => {
    // Debounce: prevent close if opened less than 300ms ago (mobile touch issue)
    if (!force && Date.now() - datePickerOpenTimeRef.current < 300) {
      return;
    }
    setShowDatePicker(false);
    setDatePickerPosition(null);
  };

  const getDatePickerAnchor = () => {
    if (dateButtonRef.current && typeof window !== 'undefined') {
      const rect = dateButtonRef.current.getBoundingClientRect();
      const offset = 8;
      const maxLeft = window.innerWidth - 220;
      return {
        top: rect.bottom + offset,
        left: Math.max(16, Math.min(rect.left, maxLeft)),
      };
    }
    if (typeof window !== 'undefined') {
      const width = Math.min(window.innerWidth - 32, 220);
      return {
        top: window.innerHeight / 2 - 120,
        left: Math.max(16, (window.innerWidth - width) / 2),
      };
    }
    return { top: 120, left: 16 };
  };

  const openDatePickerAtAnchor = () => {
    datePickerOpenTimeRef.current = Date.now();
    setDatePickerPosition(getDatePickerAnchor());
    setShowDatePicker(true);
  };

  const handleDateButtonClick = () => {
    if (showDatePicker) {
      closeDatePicker();
    } else {
      openDatePickerAtAnchor();
    }
  };

  const handleDatePickerFromMenu = () => {
    setShowContextMenu(false);
    openDatePickerAtAnchor();
  };

  useEffect(() => {
    if (!showDatePicker) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        datePickerContentRef.current?.contains(target) ||
        dateButtonRef.current?.contains(target)
      ) {
        return;
      }
      closeDatePicker(true);
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [showDatePicker]);

  const handleEditTaskRequest = () => {
    setShowContextMenu(false);
    handleEditTask?.(task.id);
  };

  // Clear long press timer
  const clearLongPressTimer = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // Swipe & Long Press Handlers
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsSwiping(true);
    isLongPress.current = false;

    // Start long press timer
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;

    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      setIsSwiping(false);
      setSwipeX(0);
      setContextMenuPosition({ x: touchX, y: touchY });
      setShowContextMenu(true);
      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, LONG_PRESS_DURATION);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX.current;

    // If user moves finger, cancel long press
    if (Math.abs(diff) > 10) {
      clearLongPressTimer();
    }

    // Limit swipe distance
    if (Math.abs(diff) < 200 && !isLongPress.current) {
      setSwipeX(diff);
    }
  };

  const onTouchEnd = () => {
    clearLongPressTimer();

    // Skip swipe actions if it was a long press
    if (isLongPress.current) {
      isLongPress.current = false;
      setSwipeX(0);
      setIsSwiping(false);
      touchStartX.current = null;
      return;
    }

    if (swipeX > SWIPE_THRESHOLD) {
      // Right Swipe -> Pin
      handlePinTask(task.id);
    } else if (swipeX < -SWIPE_THRESHOLD) {
      // Left Swipe -> Drop (Delete)
      setIsDeleting(true);
      setTimeout(() => {
        handleDeleteTask(task.id);
      }, 300); // Wait for animation
    }

    setSwipeX(0);
    setIsSwiping(false);
    touchStartX.current = null;
  };

  if (isDeleting) {
    return <div className="h-[60px] transition-all duration-300 w-full" />;
  }

  return (
    <div id={`task-${task.id}`} className="relative overflow-hidden rounded-2xl group touch-pan-y">
      {/* Swipe Background Layer */}
      <div
        className={`absolute inset-0 flex items-center justify-between px-4 transition-colors duration-300 ${
          swipeX > 50 ? 'bg-orange-100' : swipeX < -50 ? 'bg-rose-100' : 'bg-transparent'
        }`}
      >
        {/* Left Icon (Visible on Right Swipe) */}
        <div
          className={`flex items-center gap-2 text-orange-500 font-medium text-sm transition-opacity ${swipeX > 50 ? 'opacity-100' : 'opacity-0'}`}
        >
          <Pin size={18} fill={task.isPinned ? 'currentColor' : 'none'} />
          <span>{task.isPinned ? 'Unpin' : 'Pin'}</span>
        </div>

        {/* Right Icon (Visible on Left Swipe) */}
        <div
          className={`flex items-center gap-2 text-rose-500 font-medium text-sm transition-opacity ${swipeX < -50 ? 'opacity-100' : 'opacity-0'}`}
        >
          <span>Drop</span>
          <Trash2 size={18} />
        </div>
      </div>

      {/* Main Card Content */}
      <div
        draggable="true"
        onDragStart={e => handleDragStart(e, task.id)}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ transform: `translateX(${swipeX}px)` }}
        className={`
          relative bg-white border shadow-[0_2px_10px_rgba(0,0,0,0.02)] rounded-2xl p-3 
          transition-all duration-300 ease-out cursor-grab active:cursor-grabbing z-10
          ${task.isPinned ? 'border-l-4 border-l-orange-300 border-y-transparent border-r-transparent' : 'border-transparent hover:border-stone-100 hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)]'}
          ${task.isFocused ? 'ring-2 ring-orange-200 ring-offset-1' : ''}
          ${isSwiping ? 'transition-none' : ''}
        `}
      >
        <div className="flex items-start gap-3">
          {/* Drag Handle (Desktop) */}
          <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-20 text-stone-400 -ml-2 hidden md:block">
            <GripVertical size={12} />
          </div>

          <button
            onClick={() => toggleTask(task.id)}
            className="mt-0.5 text-stone-200 hover:text-orange-400 transition-colors z-10"
          >
            <Circle size={18} strokeWidth={1.5} />
          </button>

          <div className="flex-1">
            <div className="flex items-start gap-3">
              <div className="text-stone-700 font-normal text-[15px] leading-snug font-body flex-1 min-w-0 flex flex-wrap items-center gap-2">
                <span className="wrap-break-word cursor-pointer" onClick={() => onToggleExpanded(task.id)}>
                  {task.text}
                </span>

                {/* Date Tag */}
                {task.dueDate && (
                  <span
                    className={`text-[12px] px-1.5 py-0.5 rounded bg-stone-50 text-stone-400 font-medium tracking-wide flex items-center gap-1 ${
                      isOverdue(task.dueDate) ? 'text-rose-400 bg-rose-50' : ''
                    }`}
                  >
                    {formatDueDate(task.dueDate)}
                  </span>
                )}

                {/* Progress Indicator */}
                {totalSub > 0 && (
                  <span
                    className={`text-[12px] tracking-wide font-medium ${progress === 100 ? 'text-emerald-400' : 'text-stone-300'}`}
                  >
                    {completedSub}/{totalSub}
                  </span>
                )}
              </div>

              {/* Indicators */}
              <div className="flex items-center gap-2.5 shrink-0">
                <div className="flex items-center gap-2">
                  {nudges
                    .filter(n => n.showBadge)
                    .map(nudge => (
                      <TaskBadge
                        key={nudge.type}
                        type={nudge.type}
                        onClick={() => onToggleExpanded(task.id)}
                      />
                    ))}

                  {task.aiSuggestions.length > 0 && (
                    <Sparkles size={14} className="text-orange-300 mt-1 opacity-60" />
                  )}
                </div>

                {/* Focus Star Button */}
                {handleToggleFocused && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleToggleFocused(task.id);
                    }}
                    className={`ml-auto transition-all ${
                      task.isFocused ? 'text-orange-400' : 'text-stone-300 hover:text-orange-300'
                    }`}
                    title={task.isFocused ? "Remove from today's focus" : "Add to today's focus"}
                  >
                    <Star
                      size={16}
                      fill={task.isFocused ? 'currentColor' : 'none'}
                      strokeWidth={1.5}
                    />
                  </button>
                )}
              </div>
            </div>

            {/* Expanded Area: Subtasks & Suggestions */}
            <div
              className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${isExpanded ? 'max-h-[600px] opacity-100 mt-3 pb-1' : 'max-h-0 opacity-0'}`}
              onClick={e => e.stopPropagation()}
            >
              <div className="pl-2 border-l border-orange-100/60 ml-0.5 space-y-3">
                {/* Nudge Cards (shown when expanded) */}
                {nudges.length > 0 && onNudgeAction && onNudgeDismiss && (
                  <div className="space-y-2 -ml-2 mb-2">
                    {nudges.map(nudge => (
                      <NudgeCard
                        key={nudge.type}
                        type={nudge.type}
                        taskId={task.id}
                        onAction={action => onNudgeAction(task.id, action)}
                        onDismiss={() => onNudgeDismiss(task.id)}
                      />
                    ))}
                  </div>
                )}

                {/* Date Picker Action */}
                <div className="relative">
                  <button
                    ref={dateButtonRef}
                    onClick={handleDateButtonClick}
                    className="flex items-center gap-1.5 text-[13px] text-stone-400 hover:text-orange-400 transition-colors font-medium tracking-wide"
                  >
                    <Calendar size={14} />
                    {task.dueDate ? 'Change Date' : 'Add Date'}
                  </button>
                </div>

                {/* 1. Existing Sub-tasks List */}
                {task.subTasks.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {task.subTasks.map(subTask => (
                      <div key={subTask.id} className="flex items-start gap-2.5 group/sub">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            toggleSubTask(task.id, subTask.id);
                          }}
                          className={`mt-0.5 transition-colors ${subTask.completed ? 'text-emerald-400' : 'text-stone-200 hover:text-stone-400'}`}
                        >
                          {subTask.completed ? (
                            <CheckCircle2 size={15} />
                          ) : (
                            <Circle size={15} strokeWidth={1.5} />
                          )}
                        </button>
                        <span
                          className={`text-[15px] font-light leading-snug flex-1 ${subTask.completed ? 'text-stone-300 line-through' : 'text-stone-600'}`}
                        >
                          {subTask.text}
                        </span>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            deleteSubTask(task.id, subTask.id);
                          }}
                          className="text-stone-200 hover:text-rose-300 transition-opacity md:opacity-0 md:group-hover/sub:opacity-100"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 2. AI Suggestions */}
                {task.aiSuggestions.length > 0 && (
                  <div className="bg-orange-50/40 rounded-lg p-2.5 space-y-2">
                    <div className="flex items-center gap-1.5 text-[12px] uppercase tracking-wider text-orange-400 mb-1 font-heading italic">
                      <Sparkles size={12} />
                      <span>Suggestions</span>
                    </div>
                    {task.aiSuggestions.map((suggestion, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-[15px] text-stone-500 font-light opacity-80"
                      >
                        <div className="w-1 h-1 rounded-full bg-orange-300"></div>
                        {suggestion}
                      </div>
                    ))}
                    <div className="pt-1.5">
                      <button
                        onClick={() => handleAddAllSuggestions(task.id)}
                        className="text-[12px] bg-orange-100/50 hover:bg-orange-100 text-orange-600 px-2.5 py-1.5 rounded-md font-medium tracking-wide transition-colors uppercase"
                      >
                        Add all as tasks
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. Manual Add Subtask Input */}
                <form
                  onSubmit={submitManualSubTask}
                  className="flex items-center gap-2 pt-1 group/input"
                >
                  <CornerDownRight size={14} className="text-stone-200" />
                  <input
                    type="text"
                    value={manualInput}
                    onChange={e => setManualInput(e.target.value)}
                    placeholder="Add a step..."
                    className="bg-transparent border-none focus:outline-none text-[15px] placeholder:text-stone-300 text-stone-600 w-full"
                  />
                  <button
                    type="submit"
                    disabled={!manualInput}
                    className={`text-stone-300 hover:text-stone-500 transition-opacity ${manualInput ? 'opacity-100' : 'opacity-0'}`}
                  >
                    <Plus size={16} />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Date Picker Portal */}
      {showDatePicker &&
        datePickerPosition &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-100 bg-black/50">
            <div
              ref={datePickerContentRef}
              className="absolute bg-white rounded-lg shadow-xl border border-stone-100 p-2 min-w-[200px] flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-200"
              style={{ top: datePickerPosition.top, left: datePickerPosition.left }}
            >
              <button
                onClick={() => setDateQuick('today')}
                className="text-left px-3 py-1.5 text-[12px] text-stone-600 hover:bg-stone-50 rounded transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => setDateQuick('tomorrow')}
                className="text-left px-3 py-1.5 text-[12px] text-stone-600 hover:bg-stone-50 rounded transition-colors"
              >
                Tomorrow
              </button>
              <button
                onClick={() => setDateQuick('this-weekend')}
                className="text-left px-3 py-1.5 text-[12px] text-stone-600 hover:bg-stone-50 rounded transition-colors"
              >
                This Weekend
              </button>
              <button
                onClick={() => setDateQuick('next-week')}
                className="text-left px-3 py-1.5 text-[12px] text-stone-600 hover:bg-stone-50 rounded transition-colors"
              >
                Next Week
              </button>

              <div className="h-px bg-stone-100 my-0.5"></div>

              <div className="relative">
                <input
                  type="date"
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                  onChange={e => setDateQuick('custom', e.target.value)}
                />
                <button className="w-full text-left px-3 py-1.5 text-[12px] text-stone-600 hover:bg-stone-50 rounded transition-colors flex justify-between items-center">
                  <span>Pick Date...</span>
                  <Calendar size={10} className="opacity-50" />
                </button>
              </div>

              {task.dueDate && (
                <>
                  <div className="h-px bg-stone-100 my-0.5"></div>
                  <button
                    onClick={() => setDateQuick('clear')}
                    className="text-left px-3 py-1.5 text-[12px] text-rose-400 hover:bg-rose-50 rounded transition-colors"
                  >
                    Clear Date
                  </button>
                </>
              )}
            </div>
          </div>,
          document.body
        )}
      <TaskContextMenu
        isOpen={showContextMenu}
        position={contextMenuPosition}
        isFocused={task.isFocused}
        isPinned={task.isPinned}
        onClose={() => setShowContextMenu(false)}
        onToggleFocused={() => handleToggleFocused?.(task.id)}
        onTogglePinned={() => handlePinTask(task.id)}
        onDelete={() => handleDeleteTask(task.id)}
        onAddDate={handleDatePickerFromMenu}
        onEditTask={handleEditTaskRequest}
      />
    </div>
  );
};

export default TaskItem;
