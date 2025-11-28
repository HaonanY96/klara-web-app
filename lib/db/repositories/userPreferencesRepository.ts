/**
 * User Preferences Repository
 * 
 * Handles all database operations for user preferences.
 * This is a singleton pattern - there is only one preferences record per user.
 */

import { getDb } from '../index';
import type { 
  UserPreferences, 
  UpdateUserPreferences, 
  ToneStyle,
  AIFeedback,
  CreateAIFeedback,
  InferredUserState,
  DEFAULT_USER_PREFERENCES 
} from '@/types';

// Default preferences ID (singleton)
const PREFERENCES_ID = 'default-user-preferences';

// Helper to get database instance
const db = () => getDb();

/**
 * Generate a unique ID
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Get current ISO timestamp
 */
function now(): string {
  return new Date().toISOString();
}

/**
 * User Preferences Repository
 */
export const userPreferencesRepository = {
  /**
   * Get user preferences (creates default if not exists)
   */
  async get(): Promise<UserPreferences> {
    let preferences = await db().userPreferences.get(PREFERENCES_ID);
    
    if (!preferences) {
      // Create default preferences
      preferences = await this.createDefault();
    }
    
    return preferences;
  },

  /**
   * Create default preferences (internal)
   */
  async createDefault(): Promise<UserPreferences> {
    const timestamp = now();
    const preferences: UserPreferences = {
      id: PREFERENCES_ID,
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
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await db().userPreferences.add(preferences);
    console.log('[Kino] Created default user preferences');
    
    return preferences;
  },

  /**
   * Update user preferences
   */
  async update(data: Partial<Omit<UserPreferences, 'id' | 'createdAt'>>): Promise<UserPreferences> {
    const timestamp = now();
    
    // Ensure preferences exist
    await this.get();
    
    await db().userPreferences.update(PREFERENCES_ID, {
      ...data,
      updatedAt: timestamp,
    });

    return (await this.get())!;
  },

  /**
   * Update tone style
   */
  async updateToneStyle(toneStyle: ToneStyle): Promise<UserPreferences> {
    return this.update({ toneStyle });
  },

  /**
   * Update notification frequency
   */
  async updateNotificationFrequency(frequency: 'low' | 'medium' | 'high'): Promise<UserPreferences> {
    return this.update({ notificationFrequency: frequency });
  },

  /**
   * Mark Reflection intro as seen
   */
  async markReflectionIntroSeen(): Promise<UserPreferences> {
    return this.update({ hasSeenReflectionIntro: true });
  },

  /**
   * Increment tasks completed count
   */
  async incrementTasksCompleted(): Promise<UserPreferences> {
    const prefs = await this.get();
    return this.update({ tasksCompletedCount: prefs.tasksCompletedCount + 1 });
  },

  /**
   * Add feedback for an AI suggestion
   */
  async addFeedback(feedback: CreateAIFeedback): Promise<UserPreferences> {
    const preferences = await this.get();
    const timestamp = now();
    
    const newFeedback: AIFeedback = {
      ...feedback,
      id: generateId(),
      createdAt: timestamp,
    };

    const updatedHistory = [...preferences.feedbackHistory, newFeedback];
    
    // Optionally limit history size (keep last 100)
    const limitedHistory = updatedHistory.slice(-100);

    // Recalculate learned preferences based on feedback
    const learnedPreferences = this.calculateLearnedPreferences(limitedHistory);

    return this.update({
      feedbackHistory: limitedHistory,
      learnedPreferences,
    });
  },

  /**
   * Calculate learned preferences from feedback history
   */
  calculateLearnedPreferences(feedbackHistory: AIFeedback[]): UserPreferences['learnedPreferences'] {
    // Count feedback by suggestion type
    const typeStats: Record<string, { positive: number; negative: number }> = {};
    
    for (const feedback of feedbackHistory) {
      if (!typeStats[feedback.suggestionType]) {
        typeStats[feedback.suggestionType] = { positive: 0, negative: 0 };
      }
      if (feedback.reaction === 'positive') {
        typeStats[feedback.suggestionType].positive++;
      } else {
        typeStats[feedback.suggestionType].negative++;
      }
    }

    // Determine preferred and avoided types
    const preferredSuggestionTypes: string[] = [];
    const avoidedSuggestionTypes: string[] = [];

    for (const [type, stats] of Object.entries(typeStats)) {
      const total = stats.positive + stats.negative;
      if (total >= 3) { // Require at least 3 data points
        const positiveRate = stats.positive / total;
        if (positiveRate >= 0.7) {
          preferredSuggestionTypes.push(type);
        } else if (positiveRate <= 0.3) {
          avoidedSuggestionTypes.push(type);
        }
      }
    }

    // TODO: Add emoji preference detection based on feedback content analysis
    // TODO: Add preferred nudge hours based on feedback timestamps

    return {
      preferredSuggestionTypes,
      avoidedSuggestionTypes,
      prefersEmoji: null, // Will be implemented in V1.5
      preferredNudgeHours: [], // Will be implemented in V1.5
    };
  },

  /**
   * Update inferred user state
   */
  async updateInferredState(state: InferredUserState | null): Promise<UserPreferences> {
    return this.update({ inferredState: state });
  },

  /**
   * Reset preferences to default
   */
  async reset(): Promise<UserPreferences> {
    await db().userPreferences.delete(PREFERENCES_ID);
    return this.createDefault();
  },

  /**
   * Check if preferences exist
   */
  async exists(): Promise<boolean> {
    const preferences = await db().userPreferences.get(PREFERENCES_ID);
    return !!preferences;
  },
};

