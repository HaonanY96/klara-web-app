/**
 * Nudge Service
 *
 * Detects task conditions that warrant gentle nudges/reminders.
 * Based on PRD 4.1.11 Smart Task Nudge System.
 *
 * V1.0 Features:
 * - Deadline overdue detection
 * - Needs breakdown detection (complex tasks)
 * - Badge quota system (max 3 badges globally)
 */

import type { TaskWithDetails, NudgeType, TaskNudge } from '@/types';
import { isOverdue } from '@/lib/utils/date';

/**
 * Configuration for nudge detection
 */
const NUDGE_CONFIG = {
  /** Maximum number of badges to show globally */
  MAX_BADGES: 3,
  /** Minimum task text length to suggest breakdown */
  COMPLEX_TASK_LENGTH: 50,
  /** Days without activity to consider "long pending" (V1.5) */
  LONG_PENDING_DAYS: 7,
  /** Number of deadline changes to trigger "repeatedly postponed" (V1.5) */
  POSTPONE_THRESHOLD: 3,
} as const;

/**
 * Priority order for badges (lower number = higher priority)
 */
const NUDGE_PRIORITY: Record<NudgeType, number> = {
  overdue: 1,
  repeatedly_postponed: 2,
  long_pending: 3,
  needs_breakdown: 99, // No badge, lowest priority
};

/**
 * Check if a task is overdue
 */
export function isTaskOverdue(task: TaskWithDetails): boolean {
  if (!task.dueDate || task.completed) return false;
  return isOverdue(task.dueDate);
}

/**
 * Check if a task needs breakdown (complex without subtasks)
 */
export function taskNeedsBreakdown(task: TaskWithDetails): boolean {
  if (task.completed) return false;
  if (task.subTasks.length > 0) return false;
  if (task.aiSuggestions.length > 0) return false; // Already has suggestions
  return task.text.length > NUDGE_CONFIG.COMPLEX_TASK_LENGTH;
}

/**
 * Check if a task has been pending for too long (V1.5)
 * Tasks without deadline, older than 7 days, not in Q4 (Later)
 */
export function isLongPending(task: TaskWithDetails): boolean {
  if (task.completed) return false;
  if (task.dueDate) return false; // Has a deadline
  if (task.importance === 'low' && task.urgency === 'low') return false; // Q4

  const createdDate = new Date(task.createdAt);
  const daysOld = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

  return daysOld >= NUDGE_CONFIG.LONG_PENDING_DAYS;
}

/**
 * Detect all applicable nudges for a single task
 */
export function detectTaskNudges(task: TaskWithDetails): TaskNudge[] {
  const nudges: TaskNudge[] = [];
  const now = new Date().toISOString();

  // V1.0: Overdue detection
  if (isTaskOverdue(task)) {
    nudges.push({
      type: 'overdue',
      taskId: task.id,
      priority: NUDGE_PRIORITY.overdue,
      showBadge: true,
      detectedAt: now,
      dismissedAt: null,
      cooldownUntil: null,
    });
  }

  // V1.0: Needs breakdown detection
  if (taskNeedsBreakdown(task)) {
    nudges.push({
      type: 'needs_breakdown',
      taskId: task.id,
      priority: NUDGE_PRIORITY.needs_breakdown,
      showBadge: false, // No badge for this type
      detectedAt: now,
      dismissedAt: null,
      cooldownUntil: null,
    });
  }

  // V1.5: Long pending detection (disabled for now)
  // if (isLongPending(task)) {
  //   nudges.push({
  //     type: 'long_pending',
  //     taskId: task.id,
  //     priority: NUDGE_PRIORITY.long_pending,
  //     showBadge: true,
  //     detectedAt: now,
  //     dismissedAt: null,
  //     cooldownUntil: null,
  //   });
  // }

  return nudges;
}

/**
 * Detect nudges for all tasks and apply badge quota
 *
 * @param tasks - All tasks to analyze
 * @param maxBadges - Maximum number of badges to show (default: 3)
 * @returns Map of taskId -> TaskNudge[] with badges properly limited
 */
export function detectAllNudges(
  tasks: TaskWithDetails[],
  maxBadges: number = NUDGE_CONFIG.MAX_BADGES
): Map<string, TaskNudge[]> {
  const result = new Map<string, TaskNudge[]>();

  // Collect all nudges
  const allNudges: TaskNudge[] = [];

  for (const task of tasks) {
    if (task.completed) continue;

    const taskNudges = detectTaskNudges(task);
    if (taskNudges.length > 0) {
      result.set(task.id, taskNudges);
      allNudges.push(...taskNudges.filter(n => n.showBadge));
    }
  }

  // Apply badge quota - sort by priority and limit
  if (allNudges.length > maxBadges) {
    // Sort by priority (lower = higher priority)
    allNudges.sort((a, b) => a.priority - b.priority);

    // Get task IDs that should show badges
    const badgeTaskIds = new Set(allNudges.slice(0, maxBadges).map(n => n.taskId));

    // Update nudges to hide badges for tasks outside quota
    for (const [taskId, nudges] of result) {
      if (!badgeTaskIds.has(taskId)) {
        for (const nudge of nudges) {
          if (nudge.showBadge) {
            nudge.showBadge = false;
          }
        }
      }
    }
  }

  return result;
}

/**
 * Get the primary nudge for a task (highest priority)
 */
export function getPrimaryNudge(nudges: TaskNudge[]): TaskNudge | null {
  if (nudges.length === 0) return null;
  return nudges.reduce((prev, curr) => (curr.priority < prev.priority ? curr : prev));
}

/**
 * Check if a task has any active nudge
 */
export function hasActiveNudge(taskId: string, nudgeMap: Map<string, TaskNudge[]>): boolean {
  return nudgeMap.has(taskId) && (nudgeMap.get(taskId)?.length ?? 0) > 0;
}

/**
 * Check if a task should show a badge
 */
export function shouldShowBadge(taskId: string, nudgeMap: Map<string, TaskNudge[]>): boolean {
  const nudges = nudgeMap.get(taskId);
  if (!nudges) return false;
  return nudges.some(n => n.showBadge);
}

/**
 * Get the badge nudge for a task (if any)
 */
export function getBadgeNudge(
  taskId: string,
  nudgeMap: Map<string, TaskNudge[]>
): TaskNudge | null {
  const nudges = nudgeMap.get(taskId);
  if (!nudges) return null;
  return nudges.find(n => n.showBadge) ?? null;
}
