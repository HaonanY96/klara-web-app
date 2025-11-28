/**
 * State Inference Service
 * 
 * Analyzes user behavior signals to infer their current state.
 * This helps AI adjust its tone and suggestions appropriately.
 * 
 * Based on PRD 4.5.2 State Recognition Mechanism:
 * - Completion rate → energized/low
 * - Procrastination signals → avoidant
 * - Time context → tired
 * - Task granularity → needs_breakdown
 */

import type { 
  InferredUserState, 
  InferredStateType, 
  BehavioralSignal,
  TaskWithDetails,
} from '@/types';

/**
 * Signal weights for state inference
 */
const SIGNAL_WEIGHTS = {
  high: 3,
  medium: 2,
  low: 1,
} as const;

/**
 * State inference thresholds
 */
const THRESHOLDS = {
  /** Completion rate above this is considered energized */
  HIGH_COMPLETION_RATE: 0.7,
  /** Completion rate below this is considered low */
  LOW_COMPLETION_RATE: 0.3,
  /** Tasks postponed this many times trigger avoidant signal */
  POSTPONE_COUNT: 3,
  /** Hour after which user is considered tired (24h format) */
  LATE_NIGHT_HOUR: 23,
  /** Task text length that suggests it needs breakdown */
  COMPLEX_TASK_LENGTH: 50,
  /** Confidence threshold for valid inference */
  MIN_CONFIDENCE: 0.3,
  /** Inference validity duration in hours */
  INFERENCE_VALIDITY_HOURS: 4,
} as const;

/**
 * Calculate today's task completion rate
 */
function calculateCompletionRate(tasks: TaskWithDetails[]): number {
  const today = new Date().toISOString().split('T')[0];
  
  // Get tasks that are either incomplete or completed today
  const todaysTasks = tasks.filter(t => {
    // Include incomplete tasks created before or today
    if (!t.completed) return true;
    // Include tasks completed today
    if (t.completedAt?.startsWith(today)) return true;
    return false;
  });

  if (todaysTasks.length === 0) return 0.5; // Default to neutral if no tasks

  const completedToday = todaysTasks.filter(t => 
    t.completed && t.completedAt?.startsWith(today)
  ).length;

  return completedToday / todaysTasks.length;
}

/**
 * Check for procrastination signals (tasks without deadline sitting for a while)
 */
function checkProcrastinationSignals(tasks: TaskWithDetails[]): { isAvoidant: boolean; delayedTasks: number } {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString();

  // Count incomplete tasks without deadline that are older than 7 days
  const delayedTasks = tasks.filter(t => 
    !t.completed && 
    !t.dueDate && 
    t.createdAt < sevenDaysAgoStr
  ).length;

  return {
    isAvoidant: delayedTasks >= THRESHOLDS.POSTPONE_COUNT,
    delayedTasks,
  };
}

/**
 * Check if user is using the app late at night
 */
function isLateNightUsage(): boolean {
  const hour = new Date().getHours();
  return hour >= THRESHOLDS.LATE_NIGHT_HOUR || hour < 5; // 23:00 - 05:00
}

/**
 * Check for tasks that might need breakdown
 */
function checkNeedsBreakdown(tasks: TaskWithDetails[]): boolean {
  return tasks.some(t => 
    !t.completed &&
    t.text.length > THRESHOLDS.COMPLEX_TASK_LENGTH &&
    t.subTasks.length === 0
  );
}

/**
 * Generate behavioral signals from task data
 */
function generateSignals(tasks: TaskWithDetails[]): BehavioralSignal[] {
  const signals: BehavioralSignal[] = [];
  const now = new Date().toISOString();

  // 1. Completion rate signals
  const completionRate = calculateCompletionRate(tasks);
  
  if (completionRate >= THRESHOLDS.HIGH_COMPLETION_RATE) {
    signals.push({
      type: 'completion_rate',
      value: completionRate,
      observedAt: now,
      weight: 'high',
    });
  } else if (completionRate <= THRESHOLDS.LOW_COMPLETION_RATE) {
    signals.push({
      type: 'low_completion_rate',
      value: completionRate,
      observedAt: now,
      weight: 'medium',
    });
  }

  // 2. Procrastination signals
  const { isAvoidant, delayedTasks } = checkProcrastinationSignals(tasks);
  if (isAvoidant) {
    signals.push({
      type: 'procrastination',
      value: delayedTasks,
      observedAt: now,
      weight: 'high',
    });
  }

  // 3. Late night usage
  if (isLateNightUsage()) {
    signals.push({
      type: 'late_night_usage',
      value: true,
      observedAt: now,
      weight: 'low',
    });
  }

  // 4. Complex tasks without breakdown
  if (checkNeedsBreakdown(tasks)) {
    signals.push({
      type: 'needs_breakdown',
      value: true,
      observedAt: now,
      weight: 'medium',
    });
  }

  return signals;
}

/**
 * Determine the primary state from signals
 */
function determineState(signals: BehavioralSignal[]): { state: InferredStateType; confidence: number } {
  if (signals.length === 0) {
    return { state: 'okay', confidence: 0.5 };
  }

  // Score each potential state based on signals
  const stateScores: Record<InferredStateType, number> = {
    energized: 0,
    okay: 0.5, // Base score for neutral state
    low: 0,
    tired: 0,
    avoidant: 0,
    uncertain: 0,
    disengaged: 0,
    needs_breakdown: 0,
  };

  // Calculate scores based on signals
  for (const signal of signals) {
    const weight = SIGNAL_WEIGHTS[signal.weight];

    switch (signal.type) {
      case 'completion_rate':
        stateScores.energized += weight;
        break;
      case 'low_completion_rate':
        stateScores.low += weight;
        break;
      case 'procrastination':
        stateScores.avoidant += weight;
        break;
      case 'late_night_usage':
        stateScores.tired += weight;
        break;
      case 'needs_breakdown':
        stateScores.needs_breakdown += weight;
        break;
    }
  }

  // Find the highest scoring state
  let maxScore = 0;
  let primaryState: InferredStateType = 'okay';

  for (const [state, score] of Object.entries(stateScores)) {
    if (score > maxScore) {
      maxScore = score;
      primaryState = state as InferredStateType;
    }
  }

  // Calculate confidence (normalized to 0-1)
  const maxPossibleScore = signals.length * SIGNAL_WEIGHTS.high;
  const confidence = maxPossibleScore > 0 
    ? Math.min(maxScore / maxPossibleScore, 1)
    : 0.5;

  return { state: primaryState, confidence };
}

/**
 * Infer user state from task data
 * 
 * @param tasks - All user tasks with details
 * @returns Inferred user state with confidence and signals
 */
export function inferUserState(tasks: TaskWithDetails[]): InferredUserState {
  const signals = generateSignals(tasks);
  const { state, confidence } = determineState(signals);

  const now = new Date();
  const validUntil = new Date(now.getTime() + THRESHOLDS.INFERENCE_VALIDITY_HOURS * 60 * 60 * 1000);

  return {
    state,
    confidence,
    signals,
    inferredAt: now.toISOString(),
    validUntil: validUntil.toISOString(),
  };
}

/**
 * Check if an inferred state is still valid
 */
export function isStateValid(state: InferredUserState | null): boolean {
  if (!state) return false;
  return new Date() < new Date(state.validUntil);
}

/**
 * Get a human-readable description of the inferred state
 */
export function getStateDescription(state: InferredStateType): string {
  switch (state) {
    case 'energized':
      return 'You seem to be in a productive flow!';
    case 'okay':
      return 'Things seem to be going steadily.';
    case 'low':
      return 'Taking it easy today.';
    case 'tired':
      return "It's late - remember to rest.";
    case 'avoidant':
      return 'Some tasks might need attention.';
    case 'uncertain':
      return 'Feeling unsure about priorities?';
    case 'disengaged':
      return 'Welcome back!';
    case 'needs_breakdown':
      return 'Some tasks might be easier in smaller steps.';
    default:
      return '';
  }
}

