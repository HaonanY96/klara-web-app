'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { taskRepository } from '@/lib/db/repositories';
import type { Task } from '@/types';

/**
 * History Page
 *
 * Displays all completed tasks grouped by date
 */
export default function HistoryPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const completed = await taskRepository.getCompleted();
        setTasks(completed);
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadTasks();
  }, []);

  // Group tasks by date
  const groupedTasks = React.useMemo(() => {
    const groups: Record<string, Task[]> = {};

    tasks.forEach(task => {
      if (!task.completedAt) return;

      const date = new Date(task.completedAt);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let dateKey: string;

      if (date.toDateString() === today.toDateString()) {
        dateKey = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        dateKey = 'Yesterday';
      } else {
        dateKey = date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
        });
      }

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(task);
    });

    return groups;
  }, [tasks]);

  const dateKeys = Object.keys(groupedTasks);

  return (
    <div className="min-h-screen bg-[#FDFCF8]">
      <div className="max-w-md mx-auto min-h-screen bg-white/50 backdrop-blur-3xl shadow-[0_0_50px_-10px_rgba(0,0,0,0.02)]">
        {/* Header */}
        <header className="sticky top-0 bg-white/90 backdrop-blur-xl z-10 px-5 pt-12 pb-4 border-b border-stone-100">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="w-10 h-10 -ml-2 flex items-center justify-center text-stone-400 hover:text-stone-600 transition-colors rounded-xl hover:bg-stone-100"
            >
              <ArrowLeft size={22} strokeWidth={1.5} />
            </Link>
            <h1 className="text-xl font-medium text-stone-700 font-heading">History</h1>
          </div>
        </header>

        {/* Content */}
        <main className="px-5 py-6 pb-24">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-stone-400">
              <Loader2 size={24} className="animate-spin mb-3" />
              <span className="text-sm">Loading history...</span>
            </div>
          ) : dateKeys.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-stone-400">
              <CheckCircle2 size={32} strokeWidth={1} className="mb-4 text-stone-200" />
              <p className="text-sm text-center">No completed tasks yet.</p>
              <p className="text-xs text-stone-300 mt-1">Your achievements will appear here.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {dateKeys.map(dateKey => (
                <section key={dateKey}>
                  <h2 className="text-[11px] font-semibold text-stone-400 uppercase tracking-widest mb-3 font-heading">
                    {dateKey}
                  </h2>
                  <div className="space-y-2">
                    {groupedTasks[dateKey].map(task => (
                      <div
                        key={task.id}
                        className="flex items-start gap-3 p-3 bg-white rounded-xl border border-stone-100"
                      >
                        <CheckCircle2 size={18} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] text-stone-500 line-through decoration-stone-200">
                            {task.text}
                          </p>
                          {task.completedAt && (
                            <p className="text-[11px] text-stone-300 mt-1">
                              {new Date(task.completedAt).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
