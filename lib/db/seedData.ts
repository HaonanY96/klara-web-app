/**
 * Seed data for first-time users
 * These educational tasks demonstrate Kino's features while embodying our values:
 * - Lightweight & non-intrusive
 * - Companionship
 * - Recording & Growth
 */

import type { Task, SubTask } from '@/types';
import { generateId } from '@/lib/utils';

export interface SeedTask {
  text: string;
  importance: 'high' | 'low';
  urgency: 'high' | 'low';
  subTasks: { text: string; completed: boolean }[];
  aiSuggestions: string[];
  isPinned?: boolean;
  isFocused?: boolean;
  dueDate?: string;
}

/**
 * Educational tasks for first-time users
 * Designed to showcase features while being genuinely useful
 */
export const seedTasks: SeedTask[] = [
  {
    // Do First quadrant - Welcome & core features
    text: "Welcome to Kino ☀️ Tap me ✨",
    importance: 'high',
    urgency: 'high',
    isPinned: true,
    isFocused: true,
    subTasks: [
      { text: "You found it! Tasks expand to show details", completed: true },
      { text: "Try the ⭐ button to focus on what matters", completed: false },
      { text: "Swipe right to pin, left to let go", completed: false },
    ],
    aiSuggestions: [],
  },
  {
    // Schedule quadrant - Growth & AI features
    text: "Plan something meaningful",
    importance: 'high',
    urgency: 'low',
    subTasks: [],
    aiSuggestions: [
      "Break it into smaller steps",
      "Set a realistic timeline",
      "Identify the first action",
      "Celebrate small wins along the way",
    ],
  },
  {
    // Quick Tasks quadrant - Lightweight philosophy
    text: "One small step today",
    importance: 'low',
    urgency: 'high',
    subTasks: [
      { text: "Small tasks matter too ✨", completed: false },
    ],
    aiSuggestions: [],
  },
  {
    // Later quadrant - Teaching gesture & letting go
    text: "Swipe left on me to let go 👋",
    importance: 'low',
    urgency: 'low',
    subTasks: [],
    aiSuggestions: [],
  },
];

/**
 * Check if this is the user's first launch
 */
export function isFirstLaunch(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('kino_onboarded') !== 'true';
}

/**
 * Mark onboarding as complete
 */
export function markOnboarded(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('kino_onboarded', 'true');
}

/**
 * Convert seed tasks to full Task objects
 */
/**
 * Internal type for seed task data (includes UI-only fields)
 */
interface SeedTaskData {
  id: string;
  text: string;
  completed: boolean;
  importance: 'high' | 'low';
  urgency: 'high' | 'low';
  isPinned: boolean;
  isFocused: boolean;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  aiSuggestions: string[];
  showSuggestions: boolean;
}

interface SeedSubTaskData {
  id: string;
  taskId: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

export function createSeedTasks(): { tasks: SeedTaskData[]; subTasks: SeedSubTaskData[] } {
  const now = new Date();
  const tasks: SeedTaskData[] = [];
  const subTasks: SeedSubTaskData[] = [];

  seedTasks.forEach((seed, index) => {
    const taskId = generateId();
    const timestamp = new Date(now.getTime() - index * 1000).toISOString();
    
    // Create the task data
    const task: SeedTaskData = {
      id: taskId,
      text: seed.text,
      completed: false,
      importance: seed.importance,
      urgency: seed.urgency,
      isPinned: seed.isPinned || false,
      isFocused: seed.isFocused || false,
      dueDate: seed.dueDate || null,
      createdAt: timestamp,
      updatedAt: timestamp,
      aiSuggestions: seed.aiSuggestions,
      showSuggestions: index === 0, // Expand the first task
    };
    tasks.push(task);

    // Create subtasks
    seed.subTasks.forEach((st) => {
      const subTask: SeedSubTaskData = {
        id: generateId(),
        taskId,
        text: st.text,
        completed: st.completed,
        createdAt: new Date().toISOString(),
      };
      subTasks.push(subTask);
    });
  });

  return { tasks, subTasks };
}

