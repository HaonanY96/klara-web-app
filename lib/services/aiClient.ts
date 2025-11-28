/**
 * AI Client Service
 * 
 * Frontend client for calling AI API routes.
 */

import type { ToneStyle } from '@/types';

interface SuggestSubtasksParams {
  taskText: string;
  existingSubtasks?: string[];
  toneStyle?: ToneStyle;
}

interface SuggestSubtasksResult {
  suggestions: string[];
  success: boolean;
  error?: string;
}

/**
 * Request subtask suggestions from the AI API
 */
export async function requestAISuggestions(
  params: SuggestSubtasksParams
): Promise<SuggestSubtasksResult> {
  try {
    const response = await fetch('/api/ai/suggest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskText: params.taskText,
        existingSubtasks: params.existingSubtasks,
        toneStyle: params.toneStyle,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        suggestions: [],
        success: false,
        error: data.error || `HTTP ${response.status}`,
      };
    }

    return data;
  } catch (error) {
    console.error('[AI Client] Request failed:', error);
    return {
      suggestions: [],
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Check if AI should be called for this task
 * Returns true for tasks that would benefit from decomposition
 */
export function shouldSuggestSubtasks(taskText: string): boolean {
  const text = taskText.toLowerCase();
  
  // Tasks that typically need decomposition
  const complexKeywords = [
    'plan', 'organize', 'prepare', 'create', 'build', 'develop',
    'launch', 'design', 'implement', 'research', 'analyze',
    'write', 'complete', 'finish', 'project', 'trip', 'event',
    'meeting', 'presentation', 'report', 'strategy',
  ];
  
  // Check if task contains complex keywords
  const hasComplexKeyword = complexKeywords.some(kw => text.includes(kw));
  
  // Check if task is long enough to warrant decomposition
  const isLongEnough = taskText.length > 15;
  
  return hasComplexKeyword || isLongEnough;
}

