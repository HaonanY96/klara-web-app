import React from 'react';
import { Target, Circle, X } from 'lucide-react';
import type { TaskWithDetails } from '@/types';

interface TodaysFocusProps {
  tasks: TaskWithDetails[];
  onToggleComplete: (id: string) => void;
  onRemoveFocus: (id: string) => void;
  onTaskClick?: (id: string) => void;
  onReorder?: (orderedIds: string[]) => void;
  onResetOrder?: () => void;
}

const TodaysFocus = ({
  tasks,
  onToggleComplete,
  onRemoveFocus,
  onTaskClick,
  onReorder,
  onResetOrder,
}: TodaysFocusProps) => {
  if (tasks.length === 0) {
    return null;
  }

  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [ordered, setOrdered] = React.useState(tasks);

  React.useEffect(() => {
    setOrdered(tasks);
  }, [tasks]);

  const reorderList = (list: TaskWithDetails[], fromId: string, toId: string) => {
    const next = [...list];
    const fromIndex = next.findIndex(t => t.id === fromId);
    const toIndex = next.findIndex(t => t.id === toId);
    if (fromIndex === -1 || toIndex === -1) return list;
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    return next;
  };

  const handleDragStart = (id: string) => {
    setDraggingId(id);
  };

  const handleDragOver = (id: string) => {
    if (!draggingId || draggingId === id) return;
    setOrdered(prev => reorderList(prev, draggingId, id));
  };

  const handleDrop = () => {
    setDraggingId(null);
    if (onReorder) {
      onReorder(ordered.map(t => t.id));
    }
  };

  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Target size={16} className="text-orange-400" />
        <h2 className="text-[14px] font-bold text-stone-700 uppercase tracking-wider font-heading">
          Today&apos;s Focus
        </h2>
        <span className="text-[12px] text-stone-400 font-medium">{tasks.length}/3</span>
        {onResetOrder && (
          <button
            onClick={onResetOrder}
            className="ml-auto text-[12px] text-stone-400 hover:text-orange-500 font-medium underline-offset-2 hover:underline"
          >
            Reset order
          </button>
        )}
      </div>

      <div className="space-y-2">
        {ordered.map(task => (
          <div
            key={task.id}
            className="flex items-center gap-3 bg-linear-to-r from-orange-50 to-amber-50/50 border border-orange-100/50 rounded-xl px-4 py-3 group"
            draggable={!!onReorder}
            onDragStart={() => handleDragStart(task.id)}
            onDragOver={e => {
              e.preventDefault();
              handleDragOver(task.id);
            }}
            onDrop={handleDrop}
            onDragEnd={handleDrop}
          >
            <button
              onClick={() => onToggleComplete(task.id)}
              className="text-orange-300 hover:text-orange-500 transition-colors"
            >
              <Circle size={20} strokeWidth={2} />
            </button>

            <button
              onClick={() => onTaskClick?.(task.id)}
              className="flex-1 text-left text-[15px] text-stone-700 font-medium hover:text-orange-600 transition-colors"
            >
              {task.text}
            </button>

            {/* Progress indicator if has subtasks */}
            {task.subTasks.length > 0 && (
              <span className="text-[12px] text-orange-400 font-medium">
                {task.subTasks.filter(st => st.completed).length}/{task.subTasks.length}
              </span>
            )}

            <button
              onClick={() => onRemoveFocus(task.id)}
              className="text-stone-300 hover:text-stone-500 transition-all md:opacity-0 md:group-hover:opacity-100"
              title="Remove from focus"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      {tasks.length < 3 && (
        <p className="text-[13px] text-stone-300 mt-2 pl-1 italic">
          Long press any task to add it here (max 3)
        </p>
      )}
    </section>
  );
};

export default TodaysFocus;
