/**
 * Task Classification Utilities
 *
 * Keywords and logic for automatic task quadrant classification
 * based on the Eisenhower Matrix (Importance × Urgency).
 */

/**
 * Keywords that indicate high importance tasks
 * These are tasks that contribute to long-term goals and values
 */
export const IMPORTANCE_KEYWORDS = [
  // Planning & Strategy
  'plan',
  'strategy',
  'launch',
  'important',
  // Meetings & Communication
  'meeting',
  'presentation',
  'interview',
  'review',
  // Documents & Reports
  'report',
  'proposal',
  'contract',
  'budget',
  // People & Stakeholders
  'client',
  'boss',
  'customer',
  // Projects
  'project',
  'milestone',
  // Action words
  'prepare',
  'organize',
  'develop',
  'design',
  'create',
];

/**
 * Keywords that indicate high urgency tasks
 * These are tasks with time pressure or deadlines
 */
export const URGENCY_KEYWORDS = [
  // Immediate
  'now',
  'asap',
  'urgent',
  'immediately',
  'emergency',
  'critical',
  // Time-based
  'today',
  'tonight',
  'tomorrow',
  'deadline',
  'due',
  'overdue',
  'expire',
  'eod', // end of day
  'eow', // end of week
  // Bills & Payments
  'bill',
  'payment',
  'pay',
];

/**
 * Keywords that indicate low priority tasks
 * These override other detections when present
 */
export const LOW_PRIORITY_KEYWORDS = [
  // Entertainment
  'movie',
  'watch',
  'game',
  'play',
  // Deferred
  'someday',
  'maybe',
  'later',
  'eventually',
  'whenever',
  // Optional
  'optional',
  'if time',
  'nice to have',
];

/**
 * Classification result
 */
export interface TaskClassification {
  importance: 'high' | 'low';
  urgency: 'high' | 'low';
  detectedDate: string | null;
}

/**
 * Classify a task based on its text content
 *
 * @param taskText - The task description text
 * @param existingDate - Optional pre-set date (from date picker)
 * @returns Classification result with importance, urgency, and detected date
 */
export function classifyTask(taskText: string, existingDate?: string | null): TaskClassification {
  const lowerText = taskText.toLowerCase();
  let importance: 'high' | 'low' = 'low';
  let urgency: 'high' | 'low' = 'low';
  let detectedDate = existingDate || null;

  // Check for importance keywords
  if (IMPORTANCE_KEYWORDS.some(kw => lowerText.includes(kw))) {
    importance = 'high';
  }

  // Check for urgency keywords
  if (URGENCY_KEYWORDS.some(kw => lowerText.includes(kw))) {
    urgency = 'high';
  }

  // Check for low priority keywords (override previous detections)
  if (LOW_PRIORITY_KEYWORDS.some(kw => lowerText.includes(kw))) {
    importance = 'low';
    urgency = 'low';
  }

  // Date extraction from text (if no existing date)
  if (!detectedDate) {
    if (lowerText.includes('tomorrow')) {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      detectedDate = d.toISOString().split('T')[0];
    } else if (lowerText.includes('today') || lowerText.includes('tonight')) {
      detectedDate = new Date().toISOString().split('T')[0];
    }
  }

  // If date is today or tomorrow, ensure high urgency (unless explicitly low priority)
  if (detectedDate && !LOW_PRIORITY_KEYWORDS.some(kw => lowerText.includes(kw))) {
    const taskDate = new Date(detectedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (taskDate <= tomorrow) {
      urgency = 'high';
    }
  }

  return {
    importance,
    urgency,
    detectedDate,
  };
}

/**
 * Get the quadrant name based on importance and urgency
 */
export function getQuadrantName(importance: 'high' | 'low', urgency: 'high' | 'low'): string {
  if (importance === 'high' && urgency === 'high') return 'Do First';
  if (importance === 'high' && urgency === 'low') return 'Schedule';
  if (importance === 'low' && urgency === 'high') return 'Quick Tasks';
  return 'Later';
}

