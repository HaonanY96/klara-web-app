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
 * Build the prompt for subtask suggestions
 */
function buildPrompt(request: SuggestSubtasksRequest): string {
  const { taskText, existingSubtasks, toneStyle } = request;
  
  let prompt = `You are a task decomposition assistant. The user has a task: "${taskText}"

`;

  if (existingSubtasks && existingSubtasks.length > 0) {
    prompt += `The user already has these sub-tasks: ${existingSubtasks.join(', ')}

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

