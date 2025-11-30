'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  CheckCircle2, 
  Send, 
  BookOpen, 
  Cloud,
  Zap,
  BatteryLow,
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useReflections, useUserPreferences } from '@/lib/hooks';
import { formatDateForDisplay, formatTime } from '@/lib/utils/date';
import type { MoodType, Reflection, ReflectionEntry } from '@/types';

// Use BatteryLow instead of BatteryWarning
const BatteryWarning = BatteryLow;

const MOODS: Record<MoodType, {
  label: string;
  icon: typeof Zap;
  color: string;
  fill: string;
  bg: string;
  activeBorder: string;
}> = {
  Flow: { 
    label: 'Flow', 
    icon: Zap, 
    color: 'text-emerald-500', 
    fill: 'fill-emerald-500',
    bg: 'bg-emerald-50',
    activeBorder: 'border-emerald-200 bg-emerald-50 text-emerald-700'
  },
  Neutral: { 
    label: 'Neutral', 
    icon: Cloud, 
    color: 'text-stone-400', 
    fill: 'transparent',
    bg: 'bg-stone-50',
    activeBorder: 'border-stone-200 bg-stone-100 text-stone-600'
  },
  Drained: { 
    label: 'Drained', 
    icon: BatteryWarning, 
    color: 'text-rose-400', 
    fill: 'transparent',
    bg: 'bg-rose-50',
    activeBorder: 'border-rose-200 bg-rose-50 text-rose-600'
  }
};

// Daily prompts - rotates based on day of year
const DAILY_PROMPTS = [
  "What is one small thing you accomplished today that gave you energy?",
  "What moment today made you feel most alive?",
  "What did you learn about yourself today?",
  "What are you grateful for right now?",
  "What would you do differently if you could replay today?",
  "What task or conversation brought you unexpected joy?",
  "How did you take care of yourself today?",
  "What challenge did you face, and how did you handle it?",
  "Who made a positive impact on your day?",
  "What's one thing you're proud of accomplishing this week?",
  "What gave you a sense of progress today?",
  "What would make tomorrow even better?",
  "What distracted you today, and how might you avoid it?",
  "When did you feel most focused today?",
];

/**
 * Get today's prompt based on day of year
 */
function getTodayPrompt(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return DAILY_PROMPTS[dayOfYear % DAILY_PROMPTS.length];
}


const ReflectionView = () => {
  const [reflectionText, setReflectionText] = useState('');
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [todayPrompt, setTodayPrompt] = useState('');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  
  // Menu & editing states
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<{ reflectionId: string; entryId: string } | null>(null);
  const [editingEntry, setEditingEntry] = useState<{
    reflectionId: string;
    entryId: string;
    text: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Ref for today's textarea
  const todayTextareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    reflections,
    todayReflection,
    streak,
    isLoading,
    addEntry,
    updateEntry,
    deleteEntry,
  } = useReflections();

  const {
    hasSeenReflectionIntro,
    markReflectionIntroSeen,
    isLoading: isPrefsLoading,
  } = useUserPreferences();

  // Set today's prompt on mount (client-side only)
  useEffect(() => {
    setTodayPrompt(getTodayPrompt());
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (activeMenuId) setActiveMenuId(null);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeMenuId]);

  const handleSubmitReflection = async () => {
    // Allow submission if there's text OR a mood selected
    if (!reflectionText.trim() && !selectedMood) return;
    
    setIsSubmitting(true);
    try {
      await addEntry(reflectionText, selectedMood, todayPrompt);
      // Clear form after successful submission
      setReflectionText('');
      setSelectedMood(null);
      // Show success message briefly
      setShowSuccessMessage(true);
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 2500);
    } catch (error) {
      console.error('Failed to save reflection:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete entry
  const handleDeleteEntry = async (reflectionId: string, entryId: string) => {
    setIsDeleting(true);
    try {
      await deleteEntry(reflectionId, entryId);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Failed to delete entry:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle edit start
  const handleEditStart = (reflectionId: string, entry: ReflectionEntry) => {
    setEditingEntry({
      reflectionId,
      entryId: entry.id,
      text: entry.text,
    });
    setActiveMenuId(null);
  };

  // Handle edit save
  const handleEditSave = async () => {
    if (!editingEntry) return;
    
    setIsSubmitting(true);
    try {
      await updateEntry(editingEntry.reflectionId, editingEntry.entryId, {
        text: editingEntry.text,
      });
      setEditingEntry(null);
    } catch (error) {
      console.error('Failed to update entry:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit cancel
  const handleEditCancel = () => {
    setEditingEntry(null);
  };

  const hasSubmittedToday = !!todayReflection && todayReflection.entries.length > 0;
  
  // Past reflections (excluding today's)
  const pastReflections = reflections.filter(r => r.id !== todayReflection?.id);

  // Render a single entry in timeline style
  const renderEntry = (reflection: Reflection, entry: ReflectionEntry, isLast: boolean, isToday: boolean) => {
    const isEditing = editingEntry?.entryId === entry.id;
    const menuId = `${reflection.id}-${entry.id}`;
    const moodConfig = entry.mood ? MOODS[entry.mood] : null;
    
    return (
      <div key={entry.id} className="relative flex gap-3">
        {/* Timeline dot and line */}
        <div className="flex flex-col items-center shrink-0 w-3">
          <div 
            className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
            style={{ 
              backgroundColor: moodConfig 
                ? (entry.mood === 'Flow' ? '#10b981' : entry.mood === 'Drained' ? '#fb7185' : '#a8a29e')
                : '#a8a29e'
            }}
          />
          {!isLast && (
            <div className="w-px flex-1 bg-stone-200 mt-1" />
          )}
        </div>
        
        {/* Entry content */}
        <div className="flex-1 pb-4">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-stone-400 font-medium">
                {formatTime(entry.recordedAt)}
              </span>
              {moodConfig && (
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${moodConfig.bg} ${moodConfig.color}`}>
                  <moodConfig.icon size={12} fill={moodConfig.fill !== 'transparent' ? 'currentColor' : 'none'} />
                  <span>{moodConfig.label}</span>
                </div>
              )}
            </div>
            
            {/* More menu */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenuId(activeMenuId === menuId ? null : menuId);
                }}
                className="p-1 rounded-lg text-stone-300 hover:text-stone-500 hover:bg-stone-100 transition-colors opacity-0 group-hover:opacity-100"
              >
                <MoreVertical size={14} />
              </button>
              
              <AnimatePresence>
                {activeMenuId === menuId && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-1 bg-white border border-stone-100 rounded-xl shadow-lg py-1 z-10 min-w-[120px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleEditStart(reflection.id, entry)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[14px] text-stone-600 hover:bg-stone-50 transition-colors"
                    >
                      <Pencil size={15} />
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setDeleteConfirmId({ reflectionId: reflection.id, entryId: entry.id });
                        setActiveMenuId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[14px] text-rose-500 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 size={15} />
                      Delete
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          
          {/* Entry text - normal or editing mode */}
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editingEntry.text}
                onChange={(e) => setEditingEntry({
                  ...editingEntry,
                  text: e.target.value,
                })}
                className="w-full bg-stone-50 rounded-xl p-3 text-[15px] text-stone-700 placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-orange-100 transition-all min-h-[60px] resize-none font-light leading-relaxed"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleEditCancel}
                  className="px-3 py-1.5 text-[13px] text-stone-500 hover:text-stone-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 text-[13px] bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            entry.text ? (
              <p className="text-[15px] leading-relaxed text-stone-600 font-light">
                {entry.text}
              </p>
            ) : (
              <p className="text-[15px] leading-relaxed text-stone-400 font-light italic">
                Just checked in
              </p>
            )
          )}
        </div>
      </div>
    );
  };

  // Render a reflection card (day)
  const renderReflectionCard = (reflection: Reflection, isToday: boolean = false) => {
    const entries = [...reflection.entries].reverse(); // Show newest first
    
    return (
      <div 
        key={reflection.id} 
        className={`group rounded-2xl p-5 transition-colors ${
          isToday 
            ? 'bg-gradient-to-br from-orange-50/30 to-amber-50/20 border border-orange-100/50' 
            : 'bg-white hover:bg-stone-50/50 border border-stone-100/50'
        }`}
      >
        <div className="flex justify-between items-center mb-4">
          <span className={`text-[14px] font-bold uppercase tracking-wider font-heading ${
            isToday ? 'text-stone-400' : 'text-stone-700'
          }`}>
            {formatDateForDisplay(reflection.date)}
          </span>
        </div>
        
        {/* Timeline entries */}
        <div className="pl-1">
          {entries.map((entry, idx) => 
            renderEntry(reflection, entry, idx === entries.length - 1, isToday)
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-stone-400" />
      </div>
    );
  }

  return (
      <div className="animate-fadeIn mt-4 font-body space-y-6">
      
      {/* 1. Past Reflections History (shown at top) */}
      {pastReflections.length > 0 && (
        <div>
          <h2 className="text-[14px] font-bold text-stone-400 uppercase tracking-wider mb-4 pl-1 font-heading">
            Past Reflections
          </h2>
          <div className="space-y-4">
            {pastReflections
              .slice(0, 10)
              .map((reflection) => renderReflectionCard(reflection, false))}
          </div>
          
          {pastReflections.length > 10 && (
            <p className="text-center text-[12px] text-stone-400 mt-4">
              + {pastReflections.length - 10} more reflections
            </p>
          )}
        </div>
      )}

      {/* 2. Insights Section (Placeholder for V1.5) */}
      {reflections.length >= 7 && (
        <div className="bg-white border border-stone-100/50 rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <h2 className="text-[14px] font-bold text-stone-700 mb-4 flex items-center gap-2 font-heading uppercase tracking-wider">
              <BookOpen size={16} className="text-stone-400"/>
              Insights from Kino
            </h2>
            <div className="flex gap-4 items-start">
               <div className="bg-orange-50 p-2.5 rounded-full mt-0.5 shrink-0">
                 <Sparkles size={18} className="text-orange-400" />
               </div>
               <div>
                 <h3 className="text-[15px] text-stone-800 font-heading font-medium mb-1">Keep Going!</h3>
                 <p className="text-[15px] leading-relaxed text-stone-600 font-light">
                   You've reflected {reflections.length} times. Consistent reflection builds self-awareness. 
                   Personalized insights coming in V1.5!
                 </p>
               </div>
            </div>
        </div>
      )}

      {/* First-time Intro Card */}
      {!hasSeenReflectionIntro && !isPrefsLoading && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-gradient-to-br from-orange-50/50 to-amber-50/30 border border-orange-100/50 rounded-2xl p-5"
        >
          <div className="flex gap-3 items-start">
            <div className="bg-white p-2 rounded-full shadow-sm shrink-0">
              <Sparkles size={16} className="text-orange-400" />
            </div>
            <div className="flex-1">
              <p className="text-[15px] text-stone-600 leading-relaxed">
                Your mood and notes help Kino understand you better, and give smarter suggestions over time.
              </p>
              <button
                onClick={markReflectionIntroSeen}
                className="text-[13px] text-stone-400 hover:text-stone-600 mt-2 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Empty State for first-time users */}
      {reflections.length === 0 && !hasSubmittedToday && hasSeenReflectionIntro && (
        <div className="text-center py-12 text-stone-400">
          <BookOpen size={32} className="mx-auto mb-3 opacity-50" />
          <p className="text-[15px] mb-1">Your reflection journey starts here</p>
          <p className="text-[13px] text-stone-300">Answer today's prompt below</p>
        </div>
      )}

      {/* 3. Today's Record Preview (shown after submitting) */}
      {hasSubmittedToday && todayReflection && (
        renderReflectionCard(todayReflection, true)
      )}

      {/* 4. Today's Input Section (at bottom) */}
      <div className="pt-4 pb-10">
        <div className="bg-white border border-stone-100 rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] relative overflow-hidden">
          
          {/* Success Toast - appears briefly after save */}
          <AnimatePresence>
            {showSuccessMessage && (
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4, ease: [0.25, 0.8, 0.25, 1] }}
                className="absolute inset-x-0 top-0 flex justify-center"
              >
                <div className="bg-stone-800 text-white text-[13px] px-4 py-2 rounded-b-xl shadow-lg flex items-center gap-2">
                  <CheckCircle2 size={14} />
                  <span>Noted ✨</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-orange-400" />
            <span className="text-[12px] uppercase tracking-widest text-stone-500 font-heading">
              {hasSubmittedToday ? "Add Another Thought" : "Today's Prompt"}
            </span>
            {streak > 0 && (
              <span className="ml-auto text-[12px] text-orange-400 bg-orange-50 px-2.5 py-0.5 rounded-full">
                🔥 {streak} day streak
              </span>
            )}
          </div>
          
          <h2 className="text-xl text-stone-800 font-heading leading-relaxed mb-5">
            {todayPrompt || 'Loading...'}
          </h2>
          
          <textarea
            ref={todayTextareaRef}
            value={reflectionText}
            onChange={(e) => setReflectionText(e.target.value)}
            placeholder="It could be a conversation, a task, or just a quiet moment..."
            className="w-full bg-stone-50/50 rounded-xl p-4 text-[15px] text-stone-700 placeholder:text-stone-300 focus:outline-none focus:bg-stone-50 focus:ring-1 focus:ring-orange-100 transition-all min-h-[100px] resize-none mb-4 font-light leading-relaxed"
          />

          {/* Mood Selector */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(MOODS) as MoodType[]).map((moodKey) => {
                const mood = MOODS[moodKey];
                const isActive = selectedMood === moodKey;
                const Icon = mood.icon;
                
                return (
                  <button
                    key={moodKey}
                    onClick={() => setSelectedMood(isActive ? null : moodKey)}
                    className={`
                      flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all border
                      ${isActive 
                        ? mood.activeBorder
                        : 'bg-stone-50 text-stone-400 border-transparent hover:bg-stone-100'
                      }
                    `}
                  >
                    <Icon size={12} className={isActive ? mood.fill : ''} fill={isActive && mood.fill !== 'transparent' ? 'currentColor' : 'none'} />
                    {mood.label}
                  </button>
                );
              })}
            </div>
            
            <button 
              onClick={handleSubmitReflection}
              disabled={(!reflectionText.trim() && !selectedMood) || isSubmitting}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                (reflectionText.trim() || selectedMood) && !isSubmitting 
                  ? 'bg-stone-800 text-white hover:bg-stone-700 hover:scale-105 shadow-md' 
                  : 'bg-stone-200 text-stone-400'
              }`}
            >
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
          
          {/* Subtle hint */}
          {hasSubmittedToday && !showSuccessMessage && (
            <p className="text-[13px] text-stone-400 mt-3 text-center">
              Add as many thoughts as you'd like throughout the day
            </p>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setDeleteConfirmId(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-rose-50 p-2 rounded-full shrink-0">
                  <Trash2 size={18} className="text-rose-400" />
                </div>
                <div>
                  <h3 className="text-base font-heading text-stone-800 mb-1">
                    Delete this entry?
                  </h3>
                  <p className="text-[13px] text-stone-500 leading-relaxed">
                    This can't be undone, but you can always write a new one.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 text-[13px] text-stone-600 hover:text-stone-800 hover:bg-stone-50 rounded-lg transition-colors"
                >
                  Keep it
                </button>
                <button
                  onClick={() => handleDeleteEntry(deleteConfirmId.reflectionId, deleteConfirmId.entryId)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-[13px] bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReflectionView;
