import React, { useState, useRef } from 'react';
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
  Star
} from 'lucide-react';
import { formatDueDate, isOverdue, getNextWeekday, toDateString, getTodayDateString } from '@/lib/utils/date';
import { addDays } from 'date-fns';
import type { TaskWithDetails } from '@/types';

interface TaskItemProps {
  task: TaskWithDetails;
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

const TaskItem = ({ 
  task, 
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
}: TaskItemProps) => {
  const [manualInput, setManualInput] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Swipe Logic State
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const SWIPE_THRESHOLD = 100;

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
  const setDateQuick = (type: 'today' | 'tomorrow' | 'this-weekend' | 'next-week' | 'custom' | 'clear', customDate?: string) => {
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
    setShowDatePicker(false);
  };

  // Swipe Handlers
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX.current;
    // Limit swipe distance
    if (Math.abs(diff) < 200) {
       setSwipeX(diff);
    }
  };

  const onTouchEnd = () => {
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
      <div className={`absolute inset-0 flex items-center justify-between px-4 transition-colors duration-300 ${
        swipeX > 50 ? 'bg-orange-100' : swipeX < -50 ? 'bg-rose-100' : 'bg-transparent'
      }`}>
         {/* Left Icon (Visible on Right Swipe) */}
         <div className={`flex items-center gap-2 text-orange-500 font-medium text-sm transition-opacity ${swipeX > 50 ? 'opacity-100' : 'opacity-0'}`}>
            <Pin size={18} fill={task.isPinned ? "currentColor" : "none"} />
            <span>{task.isPinned ? 'Unpin' : 'Pin'}</span>
         </div>

         {/* Right Icon (Visible on Left Swipe) */}
         <div className={`flex items-center gap-2 text-rose-500 font-medium text-sm transition-opacity ${swipeX < -50 ? 'opacity-100' : 'opacity-0'}`}>
            <span>Drop</span>
            <Trash2 size={18} />
         </div>
      </div>

      {/* Main Card Content */}
      <div 
        draggable="true"
        onDragStart={(e) => handleDragStart(e, task.id)}
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
          
          {/* Pin Indicator (Always visible if pinned) */}
          {task.isPinned && (
             <div className="absolute top-1 right-1 text-orange-300 transform rotate-45 opacity-50">
               <Pin size={10} fill="currentColor" />
             </div>
          )}

          <button 
            onClick={() => toggleTask(task.id)}
            className="mt-0.5 text-stone-200 hover:text-orange-400 transition-colors z-10"
          >
            <Circle size={18} strokeWidth={1.5} />
          </button>
          
          <div className="flex-1">
            <div className="flex justify-between items-start">
               <div 
                 className="text-stone-700 font-normal text-[15px] leading-snug cursor-pointer font-body flex-1 flex flex-wrap items-center gap-2" 
                 onClick={() => toggleSuggestions(task.id)}
               >
                 <span>{task.text}</span>
                 
                 {/* Date Tag */}
                 {task.dueDate && (
                   <span className={`text-[10px] px-1.5 py-0.5 rounded bg-stone-50 text-stone-400 font-medium tracking-wide flex items-center gap-1 ${
                     isOverdue(task.dueDate) ? 'text-rose-400 bg-rose-50' : ''
                   }`}>
                     {formatDueDate(task.dueDate)}
                   </span>
                 )}

                 {/* Progress Indicator */}
                 {totalSub > 0 && (
                   <span className={`text-[10px] tracking-wide font-medium ${progress === 100 ? 'text-emerald-400' : 'text-stone-300'}`}>
                     {completedSub}/{totalSub}
                   </span>
                 )}
               </div>
               
               {/* Indicators */}
               <div className="flex gap-1.5 items-center">
                  {/* Focus Star Button */}
                  {handleToggleFocused && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFocused(task.id);
                      }}
                      className={`transition-all ${
                        task.isFocused 
                          ? 'text-orange-400' 
                          : 'text-stone-200 opacity-0 group-hover:opacity-100 hover:text-orange-300'
                      }`}
                      title={task.isFocused ? "Remove from today's focus" : "Add to today's focus"}
                    >
                      <Star size={14} fill={task.isFocused ? 'currentColor' : 'none'} strokeWidth={1.5} />
                    </button>
                  )}
                  
                  {task.aiSuggestions.length > 0 && (
                    <Sparkles size={12} className="text-orange-300 mt-1 opacity-60" />
                  )}
               </div>
            </div>
            
            {/* Expanded Area: Subtasks & Suggestions */}
            <div className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${task.showSuggestions ? 'max-h-[500px] opacity-100 mt-3 pb-1' : 'max-h-0 opacity-0'}`}>
              <div className="pl-2 border-l border-orange-100/60 ml-0.5 space-y-3">
                
                {/* Date Picker Action */}
                <div className="relative">
                  <button 
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className="flex items-center gap-1.5 text-[11px] text-stone-400 hover:text-orange-400 transition-colors font-medium tracking-wide"
                  >
                    <Calendar size={12} />
                    {task.dueDate ? 'Change Date' : 'Add Date'}
                  </button>
                  
                  {showDatePicker && (
                    <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-stone-100 p-1.5 min-w-[140px] z-60 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-200">
                       <button onClick={() => setDateQuick('today')} className="text-left px-2 py-1.5 text-[12px] text-stone-600 hover:bg-stone-50 rounded transition-colors">Today</button>
                       <button onClick={() => setDateQuick('tomorrow')} className="text-left px-2 py-1.5 text-[12px] text-stone-600 hover:bg-stone-50 rounded transition-colors">Tomorrow</button>
                       <button onClick={() => setDateQuick('this-weekend')} className="text-left px-2 py-1.5 text-[12px] text-stone-600 hover:bg-stone-50 rounded transition-colors">This Weekend</button>
                       <button onClick={() => setDateQuick('next-week')} className="text-left px-2 py-1.5 text-[12px] text-stone-600 hover:bg-stone-50 rounded transition-colors">Next Week</button>
                       
                       <div className="h-px bg-stone-100 my-0.5"></div>
                       
                       <div className="relative">
                         <input 
                            type="date" 
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                            onChange={(e) => setDateQuick('custom', e.target.value)}
                         />
                         <button className="w-full text-left px-2 py-1.5 text-[12px] text-stone-600 hover:bg-stone-50 rounded transition-colors flex justify-between items-center">
                           <span>Pick Date...</span>
                           <Calendar size={10} className="opacity-50" />
                         </button>
                       </div>

                       {task.dueDate && (
                          <>
                            <div className="h-px bg-stone-100 my-0.5"></div>
                            <button onClick={() => setDateQuick('clear')} className="text-left px-2 py-1.5 text-[12px] text-rose-400 hover:bg-rose-50 rounded transition-colors">Clear Date</button>
                          </>
                       )}
                    </div>
                  )}
                </div>

                {/* 1. Existing Sub-tasks List */}
                {task.subTasks.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {task.subTasks.map(subTask => (
                      <div key={subTask.id} className="flex items-start gap-2 group/sub">
                        <button 
                          onClick={() => toggleSubTask(task.id, subTask.id)}
                          className={`mt-0.5 transition-colors ${subTask.completed ? 'text-emerald-400' : 'text-stone-200 hover:text-stone-400'}`}
                        >
                           {subTask.completed ? <CheckCircle2 size={13} /> : <Circle size={13} strokeWidth={1.5} />}
                        </button>
                        <span className={`text-[13px] font-light leading-snug flex-1 ${subTask.completed ? 'text-stone-300 line-through' : 'text-stone-600'}`}>
                          {subTask.text}
                        </span>
                        <button 
                          onClick={() => deleteSubTask(task.id, subTask.id)}
                          className="opacity-0 group-hover/sub:opacity-100 text-stone-200 hover:text-rose-300 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* 2. AI Suggestions */}
                {task.aiSuggestions.length > 0 && (
                  <div className="bg-orange-50/40 rounded-lg p-2.5 space-y-2">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-orange-400 mb-1 font-heading italic">
                      <Sparkles size={10} />
                      <span>Suggestions</span>
                    </div>
                    {task.aiSuggestions.map((suggestion, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[13px] text-stone-500 font-light opacity-80">
                        <div className="w-0.5 h-0.5 rounded-full bg-orange-300"></div>
                        {suggestion}
                      </div>
                    ))}
                    <div className="pt-1.5">
                       <button 
                         onClick={() => handleAddAllSuggestions(task.id)}
                         className="text-[10px] bg-orange-100/50 hover:bg-orange-100 text-orange-600 px-2 py-1 rounded-md font-medium tracking-wide transition-colors uppercase"
                       >
                         Add all as tasks
                       </button>
                    </div>
                  </div>
                )}

                {/* 3. Manual Add Subtask Input */}
                <form onSubmit={submitManualSubTask} className="flex items-center gap-2 pt-1 group/input">
                   <CornerDownRight size={12} className="text-stone-200" />
                   <input 
                     type="text" 
                     value={manualInput}
                     onChange={(e) => setManualInput(e.target.value)}
                     placeholder="Add a step..."
                     className="bg-transparent border-none focus:outline-none text-[13px] placeholder:text-stone-300 text-stone-600 w-full"
                   />
                   <button 
                     type="submit" 
                     disabled={!manualInput}
                     className={`text-stone-300 hover:text-stone-500 transition-opacity ${manualInput ? 'opacity-100' : 'opacity-0'}`}
                   >
                     <Plus size={14} />
                   </button>
                </form>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskItem;
