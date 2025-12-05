/**
 * Nudge Texts / Corpus
 *
 * Centralized nudge messaging based on task-nudges.md corpus.
 * All nudge text is stored here for easy updates and future i18n support.
 *
 * Tone guide: calm, gentle, no guilt, low pressure, behavioral coach style.
 */

import type { NudgeType } from '@/types';

/**
 * Action button labels
 */
export interface NudgeActionLabels {
  setNewDate?: string;
  breakDown?: string;
  letGo?: string;
  notNow?: string;
  setFirmDate?: string;
  giveDate?: string;
}

/**
 * Nudge card texts configuration
 */
export interface NudgeCardTexts {
  /** Main message line */
  message: string;
  /** Secondary/supportive text */
  subMessage: string;
  /** Action button labels */
  actions: NudgeActionLabels;
}

/**
 * Nudge texts for each type
 * Based on PRD 4.1.11.5 and task-nudges.md corpus
 */
export const NUDGE_TEXTS: Record<NudgeType, NudgeCardTexts> = {
  overdue: {
    message: 'This one slipped past its date.',
    subMessage: 'No worries—want to set a new one?',
    actions: {
      setNewDate: 'Set new date',
      breakDown: 'Break it down',
      letGo: 'Let it go',
    },
  },

  needs_breakdown: {
    message: 'This task looks a bit big.',
    subMessage: 'Want me to help break it into smaller steps?',
    actions: {
      breakDown: 'Yes, break it down',
      notNow: 'Not now',
    },
  },

  long_pending: {
    message: 'This task has been sitting for a while.',
    subMessage: 'Want to give it a date, or let it go?',
    actions: {
      giveDate: 'Give it a date',
      breakDown: 'Break it down',
      letGo: 'Let it go',
    },
  },

  repeatedly_postponed: {
    message: 'This task keeps getting pushed back.',
    subMessage: 'Maybe it needs a smaller first step?',
    actions: {
      breakDown: 'Break it down',
      setFirmDate: 'Set firm date',
      letGo: 'Let it go',
    },
  },
};

/**
 * Dismiss followup texts
 */
export const DISMISS_TEXTS = {
  confirmation: 'Got it.',
  showLess: 'Show less of these',
};

/**
 * Alternative nudge messages for variety
 * Can be randomly selected or based on user preferences
 * Based on task-nudges.md corpus families
 */
export const NUDGE_VARIANTS: Record<NudgeType, string[]> = {
  overdue: [
    'This one slipped past its date.',
    'The deadline has passed, but we can restart gently.',
    'It makes sense this slipped—want a softer version to get going?',
    "Even though it's past due, one small move today is already meaningful.",
  ],

  needs_breakdown: [
    'This task looks a bit big.',
    'If this still feels abstract, we can just name the first tiny step.',
    "You don't have to plan everything—one small line is enough for now.",
  ],

  long_pending: [
    'This task has been sitting for a while.',
    'If today already feels full, this task can stay very light.',
    'This will matter sometime soon—want to take a light first step?',
  ],

  repeatedly_postponed: [
    'This task keeps getting pushed back.',
    "You've already noticed this task; one 3-5 minute start could make it easier.",
    "If you'd like, we can choose the simplest version to do.",
  ],
};

/**
 * Sub-message variants for more variety
 */
export const SUB_MESSAGE_VARIANTS: Record<NudgeType, string[]> = {
  overdue: [
    'No worries—want to set a new one?',
    'Want to pick a new date, or let it go?',
    'A fresh start might feel lighter.',
  ],

  needs_breakdown: [
    'Want me to help break it into smaller steps?',
    'We can start with just one clear, tiny action.',
    "What's the smallest step that still feels honest to you?",
  ],

  long_pending: [
    'Want to give it a date, or let it go?',
    'Sometimes things just need a gentle push—or permission to go.',
    'Would a deadline help, or is this one ready to release?',
  ],

  repeatedly_postponed: [
    'Maybe it needs a smaller first step?',
    'Sometimes the smallest entry point makes all the difference.',
    'A 3-5 minute version might be the key.',
  ],
};

/**
 * Get nudge texts for a specific type
 */
export function getNudgeTexts(type: NudgeType): NudgeCardTexts {
  return NUDGE_TEXTS[type];
}

/**
 * Get a random variant message for variety
 * Falls back to default if no variants available
 */
export function getRandomVariant(type: NudgeType): { message: string; subMessage: string } {
  const messages = NUDGE_VARIANTS[type];
  const subMessages = SUB_MESSAGE_VARIANTS[type];

  const message =
    messages[Math.floor(Math.random() * messages.length)] || NUDGE_TEXTS[type].message;
  const subMessage =
    subMessages[Math.floor(Math.random() * subMessages.length)] || NUDGE_TEXTS[type].subMessage;

  return { message, subMessage };
}

/**
 * Get texts based on user's inferred state (for more personalized messages)
 * This enables state-aware nudging based on task-nudges.md mapping
 */
export function getStateAwareTexts(
  type: NudgeType,
  inferredState?: 'S_low_energy' | 'S_avoidant' | 'S_neutral_or_up'
): NudgeCardTexts {
  const baseTexts = NUDGE_TEXTS[type];

  // For low energy users, use softer variants
  if (inferredState === 'S_low_energy') {
    switch (type) {
      case 'overdue':
        return {
          ...baseTexts,
          message: 'It makes sense this slipped.',
          subMessage: 'Want a softer version to get going again?',
        };
      case 'needs_breakdown':
        return {
          ...baseTexts,
          message: 'If today already feels full, this task can stay very light.',
          subMessage: 'We can just name the first tiny step.',
        };
    }
  }

  // For avoidant state, emphasize small steps
  if (inferredState === 'S_avoidant') {
    switch (type) {
      case 'overdue':
        return {
          ...baseTexts,
          subMessage: 'A 3-5 minute start will help your future self.',
        };
      case 'needs_breakdown':
        return {
          ...baseTexts,
          subMessage: 'The smallest step is the most important one.',
        };
    }
  }

  return baseTexts;
}
