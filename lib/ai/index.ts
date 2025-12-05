/**
 * AI Service Entry Point
 *
 * Provides the Gemini AI service for subtask suggestions.
 */

import type { AIService, SuggestSubtasksRequest, SuggestSubtasksResponse } from './types';
import { getGeminiService } from './gemini';

export type {
  AIService,
  AIProvider,
  SuggestSubtasksRequest,
  SuggestSubtasksResponse,
} from './types';

/**
 * Get the AI service
 */
export function getAIService(): AIService {
  const gemini = getGeminiService();

  if (gemini.isAvailable()) {
    return gemini;
  }

  // Return a dummy service that always fails
  return {
    provider: 'gemini',
    isAvailable: () => false,
    suggestSubtasks: async () => ({
      suggestions: [],
      success: false,
      error: 'AI service not configured. Please set GEMINI_API_KEY.',
    }),
  };
}

/**
 * Check if AI service is available
 */
export function isAIAvailable(): boolean {
  return getGeminiService().isAvailable();
}

/**
 * Get suggestions using the AI service
 */
export async function suggestSubtasks(
  request: SuggestSubtasksRequest
): Promise<SuggestSubtasksResponse> {
  const service = getAIService();
  return service.suggestSubtasks(request);
}
