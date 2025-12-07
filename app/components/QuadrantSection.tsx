import React, { useEffect, useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import TaskItem from './TaskItem';
import type { TaskWithDetails, TaskNudge, NudgeAction, QuadrantType } from '@/types';

interface QuadrantSectionProps {
  title: string;
  icon: React.ReactNode;
  tasks: TaskWithDetails[];
  tag: string;
  quadrantId: QuadrantType;
  isFaded?: boolean;
  handleDrop: (e: React.DragEvent, quadrantId: QuadrantType) => void;
  handleDragOver: (e: React.DragEvent) => void;
  draggedTaskId: string | null;
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
  handleDismissSuggestions: (id: string) => void;
  /** Nudge map for tasks */
  nudgeMap?: Map<string, TaskNudge[]>;
  /** Handler for nudge actions */
  onNudgeAction?: (taskId: string, action: NudgeAction) => void;
  /** Handler for nudge dismiss */
  onNudgeDismiss?: (taskId: string, type: TaskNudge['type']) => void;
  /** Expanded state getter */
  isTaskExpanded: (id: string) => boolean;
  /** Toggle expanded handler */
  onToggleTaskExpanded: (id: string) => void;
  /** Whether quadrant ordering is enabled (drag to reorder) */
  orderingEnabled?: boolean;
  /** Callback when user reorders tasks within the quadrant */
  onReorder?: (quadrantId: QuadrantType, pinnedIds: string[], unpinnedIds: string[]) => void;
  /** Reset order callback */
  onResetOrder?: (quadrantId: QuadrantType) => void;
}

const QuadrantSection = ({
  title,
  icon,
  tasks,
  tag,
  quadrantId,
  isFaded = false,
  handleDrop,
  handleDragOver,
  draggedTaskId,
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
  handleDismissSuggestions,
  nudgeMap,
  onNudgeAction,
  onNudgeDismiss,
  isTaskExpanded,
  onToggleTaskExpanded,
  orderingEnabled = false,
  onReorder,
  onResetOrder,
}: QuadrantSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [localPinned, setLocalPinned] = useState<TaskWithDetails[]>(() =>
    tasks.filter(t => t.isPinned)
  );
  const [localUnpinned, setLocalUnpinned] = useState<TaskWithDetails[]>(() =>
    tasks.filter(t => !t.isPinned)
  );

  // Sync local lists when tasks change
  useEffect(() => {
    setLocalPinned(tasks.filter(t => t.isPinned));
    setLocalUnpinned(tasks.filter(t => !t.isPinned));
  }, [tasks]);

  // Sort: Pinned first
  const pinnedTasks = orderingEnabled ? localPinned : tasks.filter(t => t.isPinned);
  const unpinnedTasks = orderingEnabled ? localUnpinned : tasks.filter(t => !t.isPinned);

  // Visibility Logic:
  // Ordering mode: show all to allow reorder.
  // Default: show all pinned + top 3 unpinned (or expanded all).
  const visibleUnpinned = orderingEnabled
    ? unpinnedTasks
    : isExpanded
      ? unpinnedTasks
      : unpinnedTasks.slice(0, 3);
  const visibleTasks = [...pinnedTasks, ...visibleUnpinned];

  const hiddenCount = orderingEnabled ? 0 : unpinnedTasks.length - visibleUnpinned.length;

  const onDragEnter = () => setIsDragOver(true);
  const onDragLeave = () => setIsDragOver(false);
  const onDrop = (e: React.DragEvent) => {
    setIsDragOver(false);
    if (!orderingEnabled || !draggingId) {
      handleDrop(e, quadrantId);
      return;
    }
    setDraggingId(null);
    onReorder?.(
      quadrantId,
      pinnedTasks.map(t => t.id),
      unpinnedTasks.map(t => t.id)
    );
  };

  if (tasks.length === 0 && !draggedTaskId) return null;

  return (
    <section
      className={`
        transition-all duration-300 rounded-2xl p-2 border-2 
        ${isDragOver ? 'border-orange-200 bg-orange-50/50' : 'border-transparent'}
        ${isFaded && !isDragOver ? 'opacity-70 hover:opacity-100' : ''}
        ${draggedTaskId ? 'min-h-[100px] border-dashed border-stone-100 bg-stone-50/30' : ''}
      `}
      onDragOver={handleDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <h3 className="flex items-center gap-2 text-[14px] font-bold text-stone-800 mb-2.5 pl-1 font-heading select-none">
        {icon}
        {title}
        <span className="ml-auto font-body text-[11px] text-stone-400 font-medium uppercase tracking-[0.15em] opacity-60">
          {tag}
        </span>
        {orderingEnabled && onResetOrder && (
          <button
            onClick={() => onResetOrder(quadrantId)}
            className="text-[12px] text-stone-400 hover:text-orange-500 font-medium underline-offset-2 hover:underline"
          >
            Reset
          </button>
        )}
      </h3>

      <div className="space-y-2.5">
        {visibleTasks.map(task => (
          <TaskItem
            key={task.id}
            task={task}
            toggleTask={toggleTask}
            handleDragStart={e => {
              handleDragStart(e, task.id);
              if (orderingEnabled) {
                setDraggingId(task.id);
              }
            }}
            handleAddAllSuggestions={handleAddAllSuggestions}
            handleAddManualSubTask={handleAddManualSubTask}
            toggleSubTask={toggleSubTask}
            deleteSubTask={deleteSubTask}
            handlePinTask={handlePinTask}
            handleDeleteTask={handleDeleteTask}
            handleUpdateDate={handleUpdateDate}
            handleToggleFocused={handleToggleFocused}
            handleEditTask={handleEditTask}
            onDismissSuggestions={handleDismissSuggestions}
            isExpanded={isTaskExpanded(task.id)}
            onToggleExpanded={onToggleTaskExpanded}
            nudges={nudgeMap?.get(task.id)}
            onNudgeAction={onNudgeAction}
            onNudgeDismiss={onNudgeDismiss}
            orderingEnabled={orderingEnabled}
            onInternalDragOver={targetId => {
              if (!orderingEnabled || !draggingId) return;
              const source = tasks.find(t => t.id === draggingId);
              const target = tasks.find(t => t.id === targetId);
              if (!source || !target) return;
              if (source.isPinned !== target.isPinned) return; // keep groups separate

              const reorder = (list: TaskWithDetails[], fromId: string, toId: string) => {
                const next = [...list];
                const fromIdx = next.findIndex(t => t.id === fromId);
                const toIdx = next.findIndex(t => t.id === toId);
                if (fromIdx === -1 || toIdx === -1) return list;
                const [item] = next.splice(fromIdx, 1);
                next.splice(toIdx, 0, item);
                return next;
              };

              if (source.isPinned) {
                setLocalPinned(prev => reorder(prev, source.id, target.id));
              } else {
                setLocalUnpinned(prev => reorder(prev, source.id, target.id));
              }
            }}
            onInternalDrop={() => {
              if (!orderingEnabled) return;
              setDraggingId(null);
              onReorder?.(
                quadrantId,
                (orderingEnabled ? localPinned : tasks.filter(t => t.isPinned)).map(t => t.id),
                (orderingEnabled ? localUnpinned : tasks.filter(t => !t.isPinned)).map(t => t.id)
              );
            }}
          />
        ))}
      </div>

      {/* Show More / Show Less Button (Only controls unpinned tasks) */}
      {unpinnedTasks.length > 3 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-2 py-1.5 flex items-center justify-center gap-1 text-[12px] text-stone-400 hover:text-stone-600 transition-colors font-medium tracking-wide uppercase"
        >
          {isExpanded ? (
            <>
              Collapse <ChevronUp size={14} />
            </>
          ) : (
            <>
              Show {hiddenCount} more <ChevronDown size={14} />
            </>
          )}
        </button>
      )}

      {/* Empty State Hint when Dragging */}
      {draggedTaskId && tasks.length === 0 && (
        <div className="text-center py-4 text-[12px] text-stone-300 italic">Drop here</div>
      )}
    </section>
  );
};

export default QuadrantSection;
