/**
 * Kino - Core Type Definitions
 * 
 * This file contains all shared types used across the application.
 */

// ============================================
// Task Types
// ============================================

/**
 * SubTask - A child task belonging to a parent Task
 */
export interface SubTask {
  /** Unique identifier */
  id: string;
  /** Parent task ID */
  taskId: string;
  /** SubTask description text */
  text: string;
  /** Whether completed */
  completed: boolean;
  /** Whether this was AI-suggested */
  isAISuggested: boolean;
  /** Sort order within parent task */
  order: number;
  /** Creation timestamp (ISO 8601) */
  createdAt: string;
  /** Completion timestamp (ISO 8601) */
  completedAt: string | null;
}

/**
 * Importance level for task prioritization
 */
export type ImportanceLevel = 'high' | 'low';

/**
 * Urgency level for task prioritization
 */
export type UrgencyLevel = 'high' | 'low';

/**
 * Quadrant type based on Eisenhower Matrix
 */
export type QuadrantType = 'Do First' | 'Schedule' | 'Quick Tasks' | 'Later';

/**
 * Task - Main task entity
 */
export interface Task {
  /** Unique identifier */
  id: string;
  /** Task description text */
  text: string;
  /** Whether completed */
  completed: boolean;
  /** Importance level: high | low */
  importance: ImportanceLevel;
  /** Urgency level: high | low */
  urgency: UrgencyLevel;
  /** Due date (ISO format YYYY-MM-DD) */
  dueDate: string | null;
  /** Whether pinned to top of quadrant */
  isPinned: boolean;
  /** Whether marked as today's focus (MIT) - max 3 tasks */
  isFocused: boolean;
  /** Date when marked as focused (for auto-clear next day) */
  focusedAt: string | null;
  /** Creation timestamp (ISO 8601) */
  createdAt: string;
  /** Last update timestamp (ISO 8601) */
  updatedAt: string;
  /** Completion timestamp (ISO 8601) */
  completedAt: string | null;
}

/**
 * Task with its subtasks and AI suggestions (for UI display)
 */
export interface TaskWithDetails extends Task {
  /** List of subtasks */
  subTasks: SubTask[];
  /** AI-generated subtask suggestions (not yet added) */
  aiSuggestions: string[];
  /** Whether to show suggestions/subtasks expanded in UI */
  showSuggestions: boolean;
}

// ============================================
// Reflection Types
// ============================================

/**
 * Mood type for reflection entries
 */
export type MoodType = 'Flow' | 'Neutral' | 'Drained';

/**
 * A single reflection entry within a day
 */
export interface ReflectionEntry {
  /** Unique identifier for this entry */
  id: string;
  /** Reflection content text */
  text: string;
  /** Mood at the time of this entry */
  mood: MoodType | null;
  /** Daily prompt that was shown */
  prompt: string;
  /** When this entry was recorded (ISO 8601) */
  recordedAt: string;
}

/**
 * Reflection - Daily reflection container (can have multiple entries per day)
 */
export interface Reflection {
  /** Unique identifier */
  id: string;
  /** Reflection date (YYYY-MM-DD) */
  date: string;
  /** Multiple entries within this day */
  entries: ReflectionEntry[];
  /** Creation timestamp (ISO 8601) */
  createdAt: string;
  /** Last update timestamp (ISO 8601) */
  updatedAt: string;
}

/**
 * Get the latest mood from a reflection
 */
export function getLatestMood(reflection: Reflection): MoodType | null {
  if (reflection.entries.length === 0) return null;
  // Find the last entry with a mood
  for (let i = reflection.entries.length - 1; i >= 0; i--) {
    if (reflection.entries[i].mood) return reflection.entries[i].mood;
  }
  return null;
}

// ============================================
// AI Suggestion Types
// ============================================

/**
 * Cached AI suggestions for a task
 */
export interface AISuggestion {
  /** Unique identifier */
  id: string;
  /** Related task ID */
  taskId: string;
  /** List of suggested subtask texts */
  suggestions: string[];
  /** Creation timestamp (ISO 8601) */
  createdAt: string;
  /** Expiration timestamp for cache (ISO 8601) */
  expiresAt: string;
}

// ============================================
// Habit/Stats Types (V1.5+)
// ============================================

/**
 * Daily habit data for statistics
 */
export interface HabitData {
  /** Unique identifier */
  id: string;
  /** Date (YYYY-MM-DD) */
  date: string;
  /** Number of tasks created on this day */
  tasksCreated: number;
  /** Number of tasks completed on this day */
  tasksCompleted: number;
  /** Average completion time in minutes */
  avgCompletionTime: number | null;
  /** Peak productive hour (0-23) */
  peakHour: number | null;
  /** Distribution of tasks by quadrant */
  quadrantDistribution: {
    doFirst: number;
    schedule: number;
    quickTasks: number;
    later: number;
  };
}

// ============================================
// Energy/Mood Types (V1.5+)
// ============================================

/**
 * Current energy state for task recommendations
 */
export type EnergyLevel = 'energized' | 'okay' | 'low';

/**
 * User's current energy state (for V1.5 energy management)
 */
export interface EnergyState {
  /** Current energy level */
  level: EnergyLevel | null;
  /** When this was last updated (ISO 8601) */
  updatedAt: string | null;
}

// ============================================
// Personalization & Tone Types
// ============================================

/**
 * AI companion tone/style presets
 * - gentle: Low pressure, emotional support, detailed guidance (default)
 * - concise: Direct, minimal words, no emotional padding
 * - coach: Motivational, has push but never judgmental
 * - silent: Minimal proactive nudges, only responds to user actions
 */
export type ToneStyle = 'gentle' | 'concise' | 'coach' | 'silent';

/**
 * Inferred user state based on behavioral signals
 */
export type InferredStateType = 
  | 'energized'      // High completion rate, active engagement
  | 'okay'           // Default/neutral state
  | 'low'            // Low completion rate, less active
  | 'tired'          // Late night usage
  | 'avoidant'       // Task postponed multiple times
  | 'uncertain'      // Frequent task edits/deletions
  | 'disengaged'     // Haven't opened app for days
  | 'needs_breakdown'; // Large tasks without subtasks

/**
 * Behavioral signal used for state inference
 */
export interface BehavioralSignal {
  /** Signal type identifier */
  type: string;
  /** Signal value */
  value: string | number | boolean;
  /** When this signal was observed (ISO 8601) */
  observedAt: string;
  /** Weight for inference: high | medium | low */
  weight: 'high' | 'medium' | 'low';
}

/**
 * AI-inferred user state based on behavioral signals
 */
export interface InferredUserState {
  /** Primary inferred state */
  state: InferredStateType;
  /** Confidence level (0-1) */
  confidence: number;
  /** Signals that led to this inference */
  signals: BehavioralSignal[];
  /** When this inference was made (ISO 8601) */
  inferredAt: string;
  /** Valid until (ISO 8601), re-infer after this */
  validUntil: string;
}

/**
 * User reaction to AI suggestion
 */
export type FeedbackReaction = 'positive' | 'negative';

/**
 * AI feedback record - tracks user reactions to AI suggestions
 */
export interface AIFeedback {
  /** Unique identifier */
  id: string;
  /** Type of AI suggestion (e.g., 'task_breakdown', 'nudge', 'encouragement') */
  suggestionType: string;
  /** The actual suggestion content */
  suggestionContent: string;
  /** User's reaction */
  reaction: FeedbackReaction;
  /** Context: what state was inferred when suggestion was made */
  inferredStateAtTime: InferredStateType | null;
  /** Context: which tone style was active */
  toneStyleAtTime: ToneStyle;
  /** Timestamp (ISO 8601) */
  createdAt: string;
}

/**
 * AB Test group assignment
 */
export interface ABTestAssignment {
  /** Test identifier (e.g., 'default_tone_v1') */
  testId: string;
  /** Assigned group (e.g., 'A', 'B', 'control') */
  group: string;
  /** When user was enrolled (ISO 8601) */
  enrolledAt: string;
  /** Test variant details */
  variant: Record<string, unknown>;
}

/**
 * User preferences for AI personalization
 */
export interface UserPreferences {
  /** Unique identifier */
  id: string;
  
  // === Onboarding ===
  /** Whether user has seen the Reflection intro */
  hasSeenReflectionIntro: boolean;
  /** Number of tasks completed (for progressive disclosure) */
  tasksCompletedCount: number;
  
  // === Tone & Style ===
  /** Selected tone style preset */
  toneStyle: ToneStyle;
  /** Notification frequency preference */
  notificationFrequency: 'low' | 'medium' | 'high';
  
  // === AB Testing ===
  /** Current AB test assignments */
  abTests: ABTestAssignment[];
  
  // === Feedback Learning ===
  /** Historical feedback records (for learning) */
  feedbackHistory: AIFeedback[];
  /** Learned preferences from feedback (computed) */
  learnedPreferences: {
    /** Preferred suggestion types (positive feedback rate > 70%) */
    preferredSuggestionTypes: string[];
    /** Avoided suggestion types (negative feedback rate > 50%) */
    avoidedSuggestionTypes: string[];
    /** Whether user prefers emoji in messages */
    prefersEmoji: boolean | null;
    /** Best time slots for nudges (hours 0-23) */
    preferredNudgeHours: number[];
  };
  
  // === Inferred State Cache ===
  /** Latest inferred user state */
  inferredState: InferredUserState | null;
  
  // === Timestamps ===
  /** Creation timestamp (ISO 8601) */
  createdAt: string;
  /** Last update timestamp (ISO 8601) */
  updatedAt: string;
}

/**
 * Default user preferences (for new users)
 */
export const DEFAULT_USER_PREFERENCES: Omit<UserPreferences, 'id' | 'createdAt' | 'updatedAt'> = {
  hasSeenReflectionIntro: false,
  tasksCompletedCount: 0,
  toneStyle: 'gentle',
  notificationFrequency: 'medium',
  abTests: [],
  feedbackHistory: [],
  learnedPreferences: {
    preferredSuggestionTypes: [],
    avoidedSuggestionTypes: [],
    prefersEmoji: null,
    preferredNudgeHours: [],
  },
  inferredState: null,
};

/**
 * Create type for AIFeedback
 */
export type CreateAIFeedback = Omit<AIFeedback, 'id' | 'createdAt'>;

/**
 * Update type for UserPreferences
 */
export type UpdateUserPreferences = Partial<Omit<UserPreferences, 'id' | 'createdAt'>> & { id: string };

// ============================================
// Utility Types
// ============================================

/**
 * Create type - omits auto-generated fields
 */
export type CreateTask = Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completedAt' | 'focusedAt'>;

export type CreateSubTask = Omit<SubTask, 'id' | 'createdAt' | 'completedAt'>;

export type CreateReflection = Omit<Reflection, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Input data for saving today's reflection
 */
export interface SaveReflectionInput {
  text: string;
  mood: MoodType | null;
  prompt: string;
}

/**
 * Update type - all fields optional except id
 */
export type UpdateTask = Partial<Omit<Task, 'id' | 'createdAt'>> & { id: string };

export type UpdateSubTask = Partial<Omit<SubTask, 'id' | 'taskId' | 'createdAt'>> & { id: string };

export type UpdateReflection = Partial<Omit<Reflection, 'id' | 'createdAt'>> & { id: string };

// ============================================
// Quadrant Helpers
// ============================================

/**
 * Quadrant configuration for UI display
 */
export interface QuadrantConfig {
  id: QuadrantType;
  title: string;
  tag: string;
  importance: ImportanceLevel;
  urgency: UrgencyLevel;
}

/**
 * All quadrant configurations
 */
export const QUADRANT_CONFIG: QuadrantConfig[] = [
  { id: 'Do First', title: 'Do Now', tag: 'act now', importance: 'high', urgency: 'high' },
  { id: 'Schedule', title: 'Plan & Focus', tag: 'plan ahead', importance: 'high', urgency: 'low' },
  { id: 'Quick Tasks', title: 'Quick Tasks', tag: 'quick wins', importance: 'low', urgency: 'high' },
  { id: 'Later', title: 'For Later', tag: 'someday', importance: 'low', urgency: 'low' },
];

/**
 * Get quadrant type for a task based on importance and urgency
 */
export function getQuadrant(task: Task): QuadrantType {
  if (task.importance === 'high' && task.urgency === 'high') return 'Do First';
  if (task.importance === 'high' && task.urgency === 'low') return 'Schedule';
  if (task.importance === 'low' && task.urgency === 'high') return 'Quick Tasks';
  return 'Later';
}

// ============================================
// Nudge System Types (V1.0)
// ============================================

/**
 * Types of nudges that can be shown to users
 */
export type NudgeType = 
  | 'overdue'           // Deadline has passed (V1.0)
  | 'needs_breakdown'   // Task is complex and needs subtasks (V1.0)
  | 'long_pending'      // Task sitting for > 7 days without deadline (V1.5)
  | 'repeatedly_postponed'; // Deadline changed >= 3 times (V1.5)

/**
 * Nudge detection result for a task
 */
export interface TaskNudge {
  /** Type of nudge */
  type: NudgeType;
  /** Task ID this nudge applies to */
  taskId: string;
  /** Priority for badge display (lower = higher priority) */
  priority: number;
  /** Whether this nudge should show a badge */
  showBadge: boolean;
  /** When this nudge was detected */
  detectedAt: string;
  /** When this nudge was dismissed (if any) */
  dismissedAt: string | null;
  /** Cooldown until (if dismissed) */
  cooldownUntil: string | null;
}

/**
 * Badge display info
 */
export interface NudgeBadgeInfo {
  /** Nudge type */
  type: NudgeType;
  /** Icon to display */
  icon: '🕐' | '💭' | '🔄';
  /** Badge color class */
  colorClass: string;
  /** Tooltip text */
  tooltip: string;
}

/**
 * Nudge card action type
 */
export type NudgeAction = 
  | 'set_new_date'
  | 'break_down'
  | 'let_go'
  | 'dismiss'
  | 'show_less';

/**
 * Get badge info for a nudge type
 */
export function getNudgeBadgeInfo(type: NudgeType): NudgeBadgeInfo | null {
  switch (type) {
    case 'overdue':
      return {
        type: 'overdue',
        icon: '🕐',
        colorClass: 'bg-orange-100 text-orange-600',
        tooltip: 'Past due date',
      };
    case 'long_pending':
      return {
        type: 'long_pending',
        icon: '💭',
        colorClass: 'bg-stone-100 text-stone-500',
        tooltip: 'Been sitting for a while',
      };
    case 'repeatedly_postponed':
      return {
        type: 'repeatedly_postponed',
        icon: '🔄',
        colorClass: 'bg-blue-100 text-blue-500',
        tooltip: 'Postponed multiple times',
      };
    case 'needs_breakdown':
      // No badge for this type
      return null;
    default:
      return null;
  }
}

