import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { TaskWithDetails } from '@/types';

interface CompletedTasksListProps {
  tasks: TaskWithDetails[];
  onToggleTask: (id: string) => void;
}

const CompletedTasksList = ({ tasks, onToggleTask }: CompletedTasksListProps) => {
  if (tasks.length === 0) return null;

  return (
    <section className="pt-4 opacity-40 hover:opacity-100 transition-opacity duration-500 mt-6 pb-8">
      <h3 className="text-[11px] font-semibold text-stone-300 uppercase tracking-widest mb-2 pl-1 font-heading">
        Done today ({tasks.length})
      </h3>
      <div className="space-y-2">
        {tasks.slice(0, 5).map(task => (
          <div key={task.id} className="flex items-center gap-3 pl-2 group py-1">
            <button
              onClick={() => onToggleTask(task.id)}
              className="text-stone-300 group-hover:text-stone-400 transition-colors"
            >
              <CheckCircle2 size={16} strokeWidth={1.5} />
            </button>
            <span className="text-stone-300 line-through decoration-stone-200 text-[14px] font-normal">
              {task.text}
            </span>
          </div>
        ))}
        {tasks.length > 5 && (
          <p className="text-[11px] text-stone-300 pl-2 mt-2">
            +{tasks.length - 5} more
          </p>
        )}
      </div>
    </section>
  );
};

export default CompletedTasksList;

