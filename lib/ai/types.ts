/**
 * AI Service Types
 *
 * Shared types for AI service implementations.
 */

import type { ToneStyle, InferredStateType } from '@/types';

/**
 * Request for generating subtask suggestions
 */
export interface SuggestSubtasksRequest {
  /** Main task text */
  taskText: string;
  /** Existing subtasks to avoid duplicates */
  existingSubtasks?: string[];
  /** User's locale for response language */
  locale?: string;
  /** User's preferred AI tone style */
  toneStyle?: ToneStyle;
  /** User's inferred state (for context-aware responses) */
  inferredState?: InferredStateType;
}

/**
 * Response from subtask suggestion
 */
export interface SuggestSubtasksResponse {
  /** Generated subtask suggestions */
  suggestions: string[];
  /** Whether the request was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * AI Provider types
 */
export type AIProvider = 'gemini';

/**
 * AI Service interface
 * All AI providers must implement this interface.
 */
export interface AIService {
  /** Provider name */
  readonly provider: AIProvider;

  /** Check if the service is configured and available */
  isAvailable(): boolean;

  /** Generate subtask suggestions for a task */
  suggestSubtasks(request: SuggestSubtasksRequest): Promise<SuggestSubtasksResponse>;
}

/**
 * AI Configuration
 */
export interface AIConfig {
  /** Which region to use */
  region: 'auto' | 'global' | 'china';
  /** Rate limit per minute */
  rateLimit: number;
}
