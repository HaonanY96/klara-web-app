/**
 * Gemini AI Service
 *
 * Google Gemini API implementation for global users.
 *
 * Model hierarchy (per architecture.md):
 * - Primary: gemini-2.5-flash-lite ($0.10/$0.40 per 1M tokens)
 * - Fallback: gemini-2.5-flash ($0.30/$2.50 per 1M tokens)
 * - Advanced: gemini-2.5-pro ($1.25/$10.00 per 1M tokens)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIService, SuggestSubtasksRequest, SuggestSubtasksResponse } from './types';

/**
 * AI Model Configuration
 */
const AI_MODELS = {
  /** Primary model - most cost effective */
  primary: 'gemini-2.5-flash-lite',
  /** Fallback model - better quality */
  fallback: 'gemini-2.5-flash',
  /** Advanced model - for complex tasks (V2.0+) */
  advanced: 'gemini-2.5-pro',
} as const;

/**
 * Get tone-specific instructions for the AI
 */
function getToneInstructions(toneStyle?: string): string {
  switch (toneStyle) {
    case 'gentle':
      return `
Tone: Warm and supportive. Use gentle, encouraging language.
- Frame suggestions as helpful offerings, not commands
- Use phrases like "You might want to..." or "Consider..."
- Keep the tone light and non-pressuring`;
    case 'concise':
      return `
Tone: Direct and efficient. Minimal words, maximum clarity.
- Skip emotional padding and pleasantries
- Use short, action-oriented phrases
- Get straight to the point`;
    case 'coach':
      return `
Tone: Motivational and action-oriented.
- Use energizing language that encourages immediate action
- Be direct but supportive
- Frame steps as achievable milestones`;
    case 'silent':
      return `
Tone: Minimal. Keep suggestions extremely brief.
- Only essential information
- No extra encouragement or padding
- Just the bare action items`;
    default:
      return ''; // Default: no special tone instructions
  }
}

/**
 * Get state-aware context instructions for the AI
 * Based on inferred user state from behavioral signals
 */
function getStateContextInstructions(inferredState?: string): string {
  switch (inferredState) {
    case 'energized':
      return `
User context: The user seems to be in a productive, energized state.
- They're likely ready to tackle more substantial steps
- Can suggest slightly more ambitious sub-tasks
- Maintain momentum with clear action items`;
    case 'low':
      return `
User context: The user appears to have low energy right now.
- Suggest smaller, more manageable steps
- Each step should feel very achievable (3-5 minutes)
- Prioritize the easiest entry points first`;
    case 'tired':
      return `
User context: The user is working late/appears tired.
- Keep steps extremely light and simple
- Suggest just 2-3 essential steps
- Focus on what can realistically be done tonight`;
    case 'avoidant':
      return `
User context: This task may feel overwhelming to the user.
- Break it down into the smallest possible steps
- Make the first step incredibly easy to start
- Remove any friction or complexity`;
    case 'needs_breakdown':
      return `
User context: This task is complex and needs clear structure.
- Provide comprehensive but clear breakdown
- Ensure logical ordering of steps
- Make dependencies between steps clear`;
    case 'uncertain':
      return `
User context: The user seems uncertain about priorities.
- Make suggestions very concrete and specific
- Focus on clarity over comprehensiveness
- Help them see a clear path forward`;
    case 'disengaged':
      return `
User context: The user is returning after some time away.
- Start with a very gentle, welcoming first step
- Keep the list short (2-3 steps max)
- Make re-engagement feel easy`;
    case 'okay':
    default:
      return ''; // Default state: no special context
  }
}

/**
 * Build the prompt for subtask suggestions
 */
function buildPrompt(request: SuggestSubtasksRequest): string {
  const { taskText, existingSubtasks, toneStyle, inferredState } = request;

  let prompt = `You are a task decomposition assistant. The user has a task: "${taskText}"

`;

  if (existingSubtasks && existingSubtasks.length > 0) {
    prompt += `The user already has these sub-tasks: ${existingSubtasks.join(', ')}

`;
  }

  // Add state-aware context instructions if available
  const stateInstructions = getStateContextInstructions(inferredState);
  if (stateInstructions) {
    prompt += `${stateInstructions}

`;
  }

  // Add tone-specific instructions if provided
  const toneInstructions = getToneInstructions(toneStyle);
  if (toneInstructions) {
    prompt += `${toneInstructions}

`;
  }

  prompt += `Please suggest 3-5 concise sub-task steps to help the user complete this task.

Requirements:
- Each sub-task should be no more than 20 words
- Steps should be specific and actionable
- Do not repeat existing sub-tasks
- Do not use dashes (—, –) in text
- Return ONLY a valid JSON array format, no other text
- Example: ["Step 1", "Step 2", "Step 3"]`;

  return prompt;
}

/**
 * Parse AI response to extract suggestions array
 */
function parseResponse(text: string): string[] {
  // Try to extract JSON array from the response
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('No JSON array found in response');
  }

  const suggestions = JSON.parse(jsonMatch[0]);

  if (!Array.isArray(suggestions)) {
    throw new Error('Response is not an array');
  }

  // Validate and clean suggestions
  return suggestions
    .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    .map(s => s.trim())
    .slice(0, 5); // Max 5 suggestions
}

/**
 * Gemini AI Service implementation
 */
export class GeminiService implements AIService {
  readonly provider = 'gemini' as const;
  private client: GoogleGenerativeAI | null = null;
  private primaryModel: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null;
  private fallbackModel: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.client = new GoogleGenerativeAI(apiKey);

      // Primary model: Flash-Lite (most cost effective)
      this.primaryModel = this.client.getGenerativeModel({
        model: AI_MODELS.primary,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        },
      });

      // Fallback model: Flash (better quality, use when primary fails)
      this.fallbackModel = this.client.getGenerativeModel({
        model: AI_MODELS.fallback,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        },
      });
    }
  }

  isAvailable(): boolean {
    return this.client !== null && this.primaryModel !== null;
  }

  async suggestSubtasks(request: SuggestSubtasksRequest): Promise<SuggestSubtasksResponse> {
    if (!this.primaryModel) {
      return {
        suggestions: [],
        success: false,
        error: 'Gemini API key not configured',
      };
    }

    const prompt = buildPrompt(request);

    // Try primary model first (Flash-Lite)
    try {
      const result = await this.primaryModel.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      const suggestions = parseResponse(text);

      return {
        suggestions,
        success: true,
      };
    } catch (primaryError) {
      console.warn('[Gemini] Primary model failed, trying fallback:', primaryError);

      // Fallback to Flash model
      if (this.fallbackModel) {
        try {
          const result = await this.fallbackModel.generateContent(prompt);
          const response = result.response;
          const text = response.text();
          const suggestions = parseResponse(text);

          return {
            suggestions,
            success: true,
          };
        } catch (fallbackError) {
          console.error('[Gemini] Fallback model also failed:', fallbackError);
        }
      }

      // Both models failed - return empty, don't block user
      console.error('[Gemini] All models failed, returning empty suggestions');
      return {
        suggestions: [],
        success: false,
        error: primaryError instanceof Error ? primaryError.message : 'Unknown error',
      };
    }
  }
}

// Singleton instance
let geminiService: GeminiService | null = null;

export function getGeminiService(): GeminiService {
  if (!geminiService) {
    geminiService = new GeminiService();
  }
  return geminiService;
}
