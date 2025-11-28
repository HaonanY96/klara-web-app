import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import TaskItem from './TaskItem';
import type { TaskWithDetails } from '@/types';

interface QuadrantSectionProps {
  title: string;
  icon: React.ReactNode;
  tasks: TaskWithDetails[];
  tag: string;
  quadrantId: string;
  isFaded?: boolean;
  handleDrop: (e: React.DragEvent, quadrantId: string) => void;
  handleDragOver: (e: React.DragEvent) => void;
  draggedTaskId: string | null;
  toggleTask: (id: string) => void;
  toggleSuggestions: (id: string) => void;
  handleDragStart: (e: React.DragEvent, id: string) => void;
  handleAddAllSuggestions: (id: string) => void;
  handleAddManualSubTask: (id: string, text: string) => void;
  toggleSubTask: (taskId: string, subTaskId: string) => void;
  deleteSubTask: (taskId: string, subTaskId: string) => void;
  handlePinTask: (id: string) => void;
  handleDeleteTask: (id: string) => void;
  handleUpdateDate: (id: string, date: string | null) => void;
  handleToggleFocused?: (id: string) => void;
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
  toggleSuggestions,
  handleDragStart,
  handleAddAllSuggestions,
  handleAddManualSubTask,
  toggleSubTask,
  deleteSubTask,
  handlePinTask,
  handleDeleteTask,
  handleUpdateDate,
  handleToggleFocused
}: QuadrantSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Sort: Pinned first
  const pinnedTasks = tasks.filter(t => t.isPinned);
  const unpinnedTasks = tasks.filter(t => !t.isPinned);
  
  // Visibility Logic:
  // Always show ALL pinned tasks.
  // Show top 3 unpinned tasks by default, or all if expanded.
  const visibleUnpinned = isExpanded ? unpinnedTasks : unpinnedTasks.slice(0, 3);
  const visibleTasks = [...pinnedTasks, ...visibleUnpinned];
  
  const hiddenCount = unpinnedTasks.length - visibleUnpinned.length;

  const onDragEnter = () => setIsDragOver(true);
  const onDragLeave = () => setIsDragOver(false);
  const onDrop = (e: React.DragEvent) => {
    setIsDragOver(false);
    handleDrop(e, quadrantId);
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
      <h3 className="flex items-center gap-1.5 text-[12px] font-bold text-stone-800 mb-2.5 pl-1 font-heading select-none">
        {icon} 
        {title}
        <span className="ml-auto font-body text-[9px] text-stone-400 font-medium uppercase tracking-[0.15em] opacity-60">
          {tag}
        </span>
      </h3>
      
      <div className="space-y-2.5">
        {visibleTasks.map(task => (
          <TaskItem 
            key={task.id} 
            task={task} 
            toggleTask={toggleTask} 
            toggleSuggestions={toggleSuggestions}
            handleDragStart={handleDragStart}
            handleAddAllSuggestions={handleAddAllSuggestions}
            handleAddManualSubTask={handleAddManualSubTask}
            toggleSubTask={toggleSubTask}
            deleteSubTask={deleteSubTask}
            handlePinTask={handlePinTask}
            handleDeleteTask={handleDeleteTask}
            handleUpdateDate={handleUpdateDate}
            handleToggleFocused={handleToggleFocused}
          />
        ))}
      </div>

      {/* Show More / Show Less Button (Only controls unpinned tasks) */}
      {unpinnedTasks.length > 3 && (
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-2 py-1.5 flex items-center justify-center gap-1 text-[10px] text-stone-400 hover:text-stone-600 transition-colors font-medium tracking-wide uppercase"
        >
          {isExpanded ? (
            <>Collapse <ChevronUp size={12} /></>
          ) : (
            <>Show {hiddenCount} more <ChevronDown size={12} /></>
          )}
        </button>
      )}
      
      {/* Empty State Hint when Dragging */}
      {draggedTaskId && tasks.length === 0 && (
         <div className="text-center py-4 text-[10px] text-stone-300 italic">
           Drop here
         </div>
      )}
    </section>
  );
};

export default QuadrantSection;
