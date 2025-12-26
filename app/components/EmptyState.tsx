'use client';

import React, { useState } from 'react';
import { Feather, PartyPopper } from 'lucide-react';

/**
 * EmptyState Component
 *
 * Shown when user has no incomplete tasks.
 * Shows different messages based on whether there are completed tasks.
 */

// Messages for when there are no tasks at all
const emptyMessages = [
  'A quiet moment. Ready when you are.',
  'All clear ✨',
  "Nothing here yet. And that's okay.",
  'Your day, your pace.',
];

// Messages for when all tasks are done
const doneMessages = [
  'All done for now! 🎉',
  'You did it! Time to rest.',
  "Everything's complete ✨",
  'Great work today!',
];

// Key for storing last shown message index
const LAST_EMPTY_MSG_KEY = 'klara_last_empty_msg';
const LAST_DONE_MSG_KEY = 'klara_last_done_msg';

function getRandomMessage(messages: string[], storageKey: string): string {
  if (typeof window === 'undefined') return messages[0];

  const lastIndex = parseInt(localStorage.getItem(storageKey) || '-1', 10);

  // Get available indices (excluding last shown)
  const availableIndices = messages.map((_, i) => i).filter(i => i !== lastIndex);

  // Pick random from available
  const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];

  // Store for next time
  localStorage.setItem(storageKey, randomIndex.toString());

  return messages[randomIndex];
}

interface EmptyStateProps {
  onAddTask?: () => void;
  hasCompletedTasks?: boolean;
}

const EmptyState = ({ onAddTask, hasCompletedTasks = false }: EmptyStateProps) => {
  // Use lazy initialization to avoid setState in useEffect
  const [message] = useState<string>(() => {
    if (typeof window === 'undefined') {
      return hasCompletedTasks ? doneMessages[0] : emptyMessages[0];
    }
    return hasCompletedTasks
      ? getRandomMessage(doneMessages, LAST_DONE_MSG_KEY)
      : getRandomMessage(emptyMessages, LAST_EMPTY_MSG_KEY);
  });

  // Don't render until client-side message is ready
  if (!message) return null;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 animate-in fade-in duration-500">
      {/* Icon - different based on state */}
      <div className={`mb-6 ${hasCompletedTasks ? 'text-orange-200' : 'text-stone-200'}`}>
        {hasCompletedTasks ? (
          <PartyPopper size={32} strokeWidth={1} />
        ) : (
          <Feather size={32} strokeWidth={1} />
        )}
      </div>

      {/* Message */}
      <p
        className={`text-center font-light text-[15px] leading-relaxed max-w-xs ${
          hasCompletedTasks ? 'text-brand' : 'text-stone-400'
        }`}
      >
        {message}
      </p>

      {/* Subtle hint - only show when no completed tasks */}
      {onAddTask && !hasCompletedTasks && (
        <button
          onClick={onAddTask}
          className="mt-8 text-[12px] text-stone-300 hover:text-brand transition-colors font-light tracking-wide"
        >
          Add something →
        </button>
      )}
    </div>
  );
};

export default EmptyState;
