import React from 'react';
import { Target, Circle, X } from 'lucide-react';
import type { TaskWithDetails } from '@/types';

interface TodaysFocusProps {
  tasks: TaskWithDetails[];
  onToggleComplete: (id: string) => void;
  onRemoveFocus: (id: string) => void;
  onTaskClick?: (id: string) => void;
}

const TodaysFocus = ({ tasks, onToggleComplete, onRemoveFocus, onTaskClick }: TodaysFocusProps) => {
  if (tasks.length === 0) {
    return null;
  }

  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Target size={14} className="text-orange-400" />
        <h2 className="text-[12px] font-bold text-stone-700 uppercase tracking-wider font-heading">
          Today's Focus
        </h2>
        <span className="text-[10px] text-stone-400 font-medium">
          {tasks.length}/3
        </span>
      </div>
      
      <div className="space-y-2">
        {tasks.map((task) => (
          <div 
            key={task.id}
            className="flex items-center gap-3 bg-gradient-to-r from-orange-50 to-amber-50/50 border border-orange-100/50 rounded-xl px-4 py-3 group"
          >
            <button 
              onClick={() => onToggleComplete(task.id)}
              className="text-orange-300 hover:text-orange-500 transition-colors"
            >
              <Circle size={18} strokeWidth={2} />
            </button>
            
            <button 
              onClick={() => onTaskClick?.(task.id)}
              className="flex-1 text-left text-[15px] text-stone-700 font-medium hover:text-orange-600 transition-colors"
            >
              {task.text}
            </button>
            
            {/* Progress indicator if has subtasks */}
            {task.subTasks.length > 0 && (
              <span className="text-[10px] text-orange-400 font-medium">
                {task.subTasks.filter(st => st.completed).length}/{task.subTasks.length}
              </span>
            )}
            
            <button 
              onClick={() => onRemoveFocus(task.id)}
              className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-stone-500 transition-all"
              title="Remove from focus"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      
      {tasks.length < 3 && (
        <p className="text-[11px] text-stone-300 mt-2 pl-1 italic">
          Tap ⭐ on any task to add it here (max 3)
        </p>
      )}
    </section>
  );
};

export default TodaysFocus;

