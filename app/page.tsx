"use client";

import React, { useState, useEffect, useRef } from 'react';
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
  Pin
} from 'lucide-react';
import QuadrantSection from './components/QuadrantSection';
import ReflectionView from './components/ReflectionView';

// --- TYPES ---
interface SubTask {
  id: number | string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: number | string;
  text: string;
  completed: boolean;
  importance: string;
  urgency: string;
  aiSuggestions: string[];
  showSuggestions: boolean;
  subTasks: SubTask[];
  dueDate: string | null; // ISO Date string YYYY-MM-DD
  isPinned: boolean;
}

// --- MOCK DATA ---
const INITIAL_TASKS: Task[] = [
  { 
    id: 1, 
    text: "Finalize Q3 Strategy document", 
    completed: false, 
    importance: 'high', 
    urgency: 'high', 
    aiSuggestions: [], 
    showSuggestions: false,
    subTasks: [],
    dueDate: null,
    isPinned: true 
  },
  { 
    id: 2, 
    text: "Plan a 3-day trip to Kyoto", 
    completed: false, 
    importance: 'high', 
    urgency: 'low', 
    aiSuggestions: ["Check flight availability", "Book ryokan/hotel", "Create itinerary draft", "Buy JR Pass"], 
    showSuggestions: true, 
    subTasks: [],
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
    isPinned: false
  },
  { 
    id: 3, 
    text: "Pay electricity bill", 
    completed: false, 
    importance: 'low', 
    urgency: 'high', 
    aiSuggestions: [], 
    showSuggestions: false,
    subTasks: [],
    dueDate: null,
    isPinned: false
  },
  { 
    id: 4, 
    text: "Email design team", 
    completed: false, 
    importance: 'low', 
    urgency: 'low', 
    aiSuggestions: [], 
    showSuggestions: false,
    subTasks: [],
    dueDate: null,
    isPinned: false
  }, 
  { 
    id: 5, 
    text: "Watch that new sci-fi movie", 
    completed: false, 
    importance: 'low', 
    urgency: 'low', 
    aiSuggestions: [], 
    showSuggestions: false,
    subTasks: [],
    dueDate: null,
    isPinned: false
  },
  { 
    id: 6, 
    text: "Buy groceries", 
    completed: false, 
    importance: 'low', 
    urgency: 'high', 
    aiSuggestions: [], 
    showSuggestions: false,
    subTasks: [],
    dueDate: null,
    isPinned: false
  },
  { 
    id: 7, 
    text: "Call Mom", 
    completed: false, 
    importance: 'high', 
    urgency: 'low', 
    aiSuggestions: [], 
    showSuggestions: false,
    subTasks: [],
    dueDate: null,
    isPinned: false
  },
];

const KinoApp = () => {
  const [activeTab, setActiveTab] = useState('focus'); 
  const [inputText, setInputText] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<number | string | null>(null);
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [formattedDate, setFormattedDate] = useState('');
  
  // Input Date State
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [inputDueDate, setInputDueDate] = useState<string | null>(null);
  const [showInputDatePicker, setShowInputDatePicker] = useState(false);

  // Format date on client side only to avoid hydration mismatch
  useEffect(() => {
    setFormattedDate(
      new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    );
  }, []);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const lowerText = inputText.toLowerCase();
    let detectedImportance = 'low';
    let detectedUrgency = 'low';
    let suggestions: string[] = [];
    let autoDetectedDate = inputDueDate;

    // Basic AI Simulation for Matrix
    if (lowerText.includes('plan') || lowerText.includes('strategy') || lowerText.includes('launch')) {
      detectedImportance = 'high';
    }
    if (lowerText.includes('now') || lowerText.includes('asap') || lowerText.includes('urgent') || lowerText.includes('bill')) {
      detectedUrgency = 'high';
    }

    // Basic AI Date Extraction (Mock)
    if (!autoDetectedDate) {
      if (lowerText.includes('tomorrow')) {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        autoDetectedDate = d.toISOString().split('T')[0];
      } else if (lowerText.includes('today')) {
        autoDetectedDate = new Date().toISOString().split('T')[0];
      }
    }

    // Demo Data Logic
    if (lowerText.includes("trip") || lowerText.includes("kyoto")) {
      suggestions = ["Check flight availability", "Book ryokan/hotel", "Create itinerary draft", "Buy JR Pass"];
      detectedImportance = 'high';
      detectedUrgency = 'low';
    } else if (lowerText.includes("launch") || lowerText.includes("website")) {
      suggestions = ["Finalize domain setup", "Check mobile responsiveness", "Set up analytics", "Prepare social media announcement"];
      detectedImportance = 'high';
      detectedUrgency = 'high';
    } else if (lowerText.includes("movie") || lowerText.includes("watch") || lowerText.includes("game") || lowerText.includes("someday")) {
       detectedImportance = 'low';
       detectedUrgency = 'low';
    }

    const newTask: Task = {
      id: Date.now(),
      text: inputText,
      completed: false,
      importance: detectedImportance,
      urgency: detectedUrgency,
      aiSuggestions: suggestions,
      showSuggestions: suggestions.length > 0,
      subTasks: [],
      dueDate: autoDetectedDate,
      isPinned: false
    };

    if (suggestions.length > 0) {
      setIsAiThinking(true);
      setTimeout(() => {
        setTasks(prev => [newTask, ...prev]);
        setIsAiThinking(false);
        setInputText('');
        setInputDueDate(null);
      }, 1500);
    } else {
      setTasks(prev => [newTask, ...prev]);
      setInputText('');
      setInputDueDate(null);
    }
  };

  const toggleTask = (id: number | string) => {
    setTasks(tasks.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    ));
  };

  const toggleSuggestions = (id: number | string) => {
    setTasks(tasks.map(t => 
      t.id === id ? { ...t, showSuggestions: !t.showSuggestions } : t
    ));
  };

  // --- New Actions: Pin, Delete (Drop), Update Date ---

  const handlePinTask = (id: number | string) => {
    setTasks(prev => prev.map(t => 
      t.id === id ? { ...t, isPinned: !t.isPinned } : t
    ));
  };

  const handleDeleteTask = (id: number | string) => {
    // In a real app, we might want to wait for animation, but we'll handle state directly here
    // The component will handle the fade-out animation before calling this if we want perfect sync,
    // but for simplicity, we remove it and React re-renders. 
    // Better UX: Delay removal slightly or just remove.
    // We'll let the component call this after animation.
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleUpdateDate = (id: number | string, date: string | null) => {
    setTasks(prev => prev.map(t => 
      t.id === id ? { ...t, dueDate: date } : t
    ));
  };

  // --- Sub-task Logic ---

  const handleAddAllSuggestions = (taskId: number | string) => {
    setTasks(prev => prev.map(task => {
      if (task.id !== taskId) return task;
      
      const newSubTasks = task.aiSuggestions.map(text => ({
        id: Date.now() + Math.random(),
        text: text,
        completed: false
      }));

      return {
        ...task,
        subTasks: [...task.subTasks, ...newSubTasks],
        aiSuggestions: [], 
        showSuggestions: true 
      };
    }));
  };

  const handleAddManualSubTask = (taskId: number | string, text: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id !== taskId) return task;
      return {
        ...task,
        subTasks: [...task.subTasks, { id: Date.now(), text, completed: false }]
      };
    }));
  };

  const toggleSubTask = (taskId: number | string, subTaskId: number | string) => {
    setTasks(prev => prev.map(task => {
      if (task.id !== taskId) return task;
      return {
        ...task,
        subTasks: task.subTasks.map(st => 
          st.id === subTaskId ? { ...st, completed: !st.completed } : st
        )
      };
    }));
  };

  const deleteSubTask = (taskId: number | string, subTaskId: number | string) => {
    setTasks(prev => prev.map(task => {
      if (task.id !== taskId) return task;
      return {
        ...task,
        subTasks: task.subTasks.filter(st => st.id !== subTaskId)
      };
    }));
  };

  // --- Drag and Drop Logic ---
  const handleDragStart = (e: React.DragEvent, taskId: number | string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetQuadrant: string) => {
    e.preventDefault();
    if (!draggedTaskId) return;

    let updates = {};
    switch (targetQuadrant) {
      case 'Do First': updates = { importance: 'high', urgency: 'high' }; break;
      case 'Schedule': updates = { importance: 'high', urgency: 'low' }; break;
      case 'Quick Tasks': updates = { importance: 'low', urgency: 'high' }; break;
      case 'Later': updates = { importance: 'low', urgency: 'low' }; break;
      default: return;
    }

    setTasks(prev => {
      const taskIndex = prev.findIndex(t => t.id === draggedTaskId);
      if (taskIndex === -1) return prev;
      
      const updatedTask = { ...prev[taskIndex], ...updates };
      const newTasks = [...prev];
      newTasks.splice(taskIndex, 1);
      return [updatedTask, ...newTasks];
    });
    
    setDraggedTaskId(null);
  };

  const getQuadrant = (task: Task) => {
    if (task.importance === 'high' && task.urgency === 'high') return 'Do First';
    if (task.importance === 'high' && task.urgency === 'low') return 'Schedule';
    if (task.importance === 'low' && task.urgency === 'high') return 'Quick Tasks';
    return 'Later';
  };

  const groupedTasks = {
    'Do First': tasks.filter(t => !t.completed && getQuadrant(t) === 'Do First'),
    'Schedule': tasks.filter(t => !t.completed && getQuadrant(t) === 'Schedule'),
    'Quick Tasks': tasks.filter(t => !t.completed && getQuadrant(t) === 'Quick Tasks'),
    'Later': tasks.filter(t => !t.completed && getQuadrant(t) === 'Later'),
  };

  // Quick Date Helpers for Input
  const setInputDateQuick = (type: 'today' | 'tomorrow' | 'this-weekend' | 'next-week' | 'custom', customDate?: string) => {
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

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-stone-700 font-sans selection:bg-orange-100">
      <div className="max-w-md mx-auto min-h-screen flex flex-col relative bg-white/50 backdrop-blur-3xl shadow-[0_0_50px_-10px_rgba(0,0,0,0.02)]">
        
        {/* Header */}
        <header className="pt-10 px-7 pb-4 flex justify-between items-end">
          <div>
            <div className="text-[11px] font-medium tracking-wider text-stone-400 uppercase mb-1 font-heading italic opacity-80">
              {formattedDate}
            </div>
            <h1 className="text-3xl font-medium tracking-tight flex items-center gap-2 text-orange-400 font-heading">
              Kino
            </h1>
          </div>
          
          <div 
            className="w-7 h-7 rounded-full bg-white border border-stone-100 shadow-sm flex items-center justify-center text-stone-400 cursor-help transition-all hover:scale-105"
            title="Kino is active and listening"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60 animate-pulse"></div>
          </div>
        </header>

        <main className="flex-1 px-5 overflow-y-auto pb-24 scrollbar-hide font-body">
          
          {activeTab === 'focus' ? ( 
            <>
              {/* Input Area */}
              <div className="mb-8 relative group mt-2 z-20">
                <form onSubmit={handleAddTask} className="relative">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => {
                      // Delay blur to allow clicking on the date picker
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
                           <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-xl border border-stone-100 p-2 min-w-[140px] z-50 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-200">
                              <button type="button" onClick={() => setInputDateQuick('today')} className="text-left px-3 py-2 text-[13px] text-stone-600 hover:bg-stone-50 rounded-lg transition-colors">Today</button>
                              <button type="button" onClick={() => setInputDateQuick('tomorrow')} className="text-left px-3 py-2 text-[13px] text-stone-600 hover:bg-stone-50 rounded-lg transition-colors">Tomorrow</button>
                              <button type="button" onClick={() => setInputDateQuick('this-weekend')} className="text-left px-3 py-2 text-[13px] text-stone-600 hover:bg-stone-50 rounded-lg transition-colors">This Weekend</button>
                              <button type="button" onClick={() => setInputDateQuick('next-week')} className="text-left px-3 py-2 text-[13px] text-stone-600 hover:bg-stone-50 rounded-lg transition-colors">Next Week</button>
                              
                              <div className="h-px bg-stone-100 my-0.5"></div>
                              
                              <div className="relative">
                                 <input 
                                    type="date" 
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                                    onChange={(e) => setInputDateQuick('custom', e.target.value)}
                                 />
                                 <button type="button" className="w-full text-left px-3 py-2 text-[13px] text-stone-600 hover:bg-stone-50 rounded-lg transition-colors flex justify-between items-center">
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
                
                {isAiThinking ? (
                  <div className="absolute top-14 left-0 text-[11px] text-stone-400 flex items-center gap-1.5 animate-pulse mt-1">
                    <Sparkles size={10} className="text-orange-400"/>
                    <span className="font-medium tracking-wide">Decomposing task...</span>
                  </div>
                ) : (
                  <div className="mt-2 text-[11px] text-stone-300 flex flex-wrap gap-2 font-light items-center min-h-[20px]">
                     {inputDueDate && (
                       <span className="text-orange-400 bg-orange-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                         <Calendar size={10} /> 
                         {new Date(inputDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                         <button onClick={() => setInputDueDate(null)} className="hover:text-orange-600 ml-1">×</button>
                       </span>
                     )}
                     {!inputText && !inputDueDate && (
                       <>
                        <span className="mr-0.5">Try:</span>
                        <button 
                            onClick={() => setInputText("Plan a 3-day trip to Kyoto")}
                            className="hover:text-stone-500 transition-colors border-b border-stone-100 hover:border-stone-300 pb-0.5"
                        >
                          "Plan trip to Kyoto"
                        </button>
                       </>
                     )}
                  </div>
                )}
              </div>

              {/* Matrix-based Task List with Drag & Drop */}
              <div className="space-y-5">
                
                <QuadrantSection 
                  title="Do Now" 
                  icon={<Zap size={12} className="text-rose-400" />} 
                  tasks={groupedTasks['Do First']} 
                  tag="requires attention"
                  quadrantId="Do First"
                  handleDrop={handleDrop}
                  handleDragOver={handleDragOver}
                  draggedTaskId={draggedTaskId}
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
                />

                <QuadrantSection 
                  title="Plan & Focus" 
                  icon={<Calendar size={12} className="text-emerald-500" />} 
                  tasks={groupedTasks['Schedule']} 
                  tag="high value"
                  quadrantId="Schedule"
                  handleDrop={handleDrop}
                  handleDragOver={handleDragOver}
                  draggedTaskId={draggedTaskId}
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
                />

                <QuadrantSection 
                  title="Quick Tasks" 
                  icon={<Clock size={12} className="text-orange-400" />} 
                  tasks={groupedTasks['Quick Tasks']} 
                  tag="easy wins"
                  quadrantId="Quick Tasks"
                  handleDrop={handleDrop}
                  handleDragOver={handleDragOver}
                  draggedTaskId={draggedTaskId}
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
                />

                <QuadrantSection 
                  title="For Later" 
                  icon={<Coffee size={12} className="text-stone-400" />} 
                  tasks={groupedTasks['Later']} 
                  tag="no rush"
                  quadrantId="Later"
                  isFaded={true}
                  handleDrop={handleDrop}
                  handleDragOver={handleDragOver}
                  draggedTaskId={draggedTaskId}
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
                />

                {/* Completed */}
                {tasks.some(t => t.completed) && (
                  <section className="pt-4 opacity-40 hover:opacity-100 transition-opacity duration-500 mt-6 pb-8">
                     <h3 className="text-[11px] font-semibold text-stone-300 uppercase tracking-widest mb-2 pl-1 font-heading">
                      Done
                    </h3>
                    <div className="space-y-2">
                      {tasks.filter(t => t.completed).map(task => (
                        <div key={task.id} className="flex items-center gap-3 pl-2 group py-1">
                           <button onClick={() => toggleTask(task.id)} className="text-stone-300 group-hover:text-stone-400 transition-colors">
                            <CheckCircle2 size={16} strokeWidth={1.5} />
                          </button>
                          <span className="text-stone-300 line-through decoration-stone-200 text-[14px] font-normal">
                            {task.text}
                          </span>
                        </div>
                      ))}
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

        {/* Nav */}
        <nav className="absolute bottom-0 w-full bg-white/90 backdrop-blur-xl border-t border-stone-100/50 pb-8 pt-5 px-12 flex justify-between items-center text-[10px] font-bold tracking-widest text-stone-300 uppercase font-heading z-10">
          <button 
            onClick={() => setActiveTab('focus')}
            className={`flex flex-col items-center gap-1.5 transition-colors duration-300 ${activeTab === 'focus' ? 'text-stone-800' : 'hover:text-stone-500'}`}
          >
            <Sun size={18} strokeWidth={2} className={activeTab === 'focus' ? 'text-orange-400' : ''} />
            <span>Focus</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('reflection')}
            className={`flex flex-col items-center gap-1.5 transition-colors duration-300 ${activeTab === 'reflection' ? 'text-stone-800' : 'hover:text-stone-500'}`}
          >
            <Moon size={18} strokeWidth={2} className={activeTab === 'reflection' ? 'text-orange-400' : ''} />
            <span>Reflection</span>
          </button>
        </nav>

      </div>
    </div>
  );
};

export default KinoApp;
