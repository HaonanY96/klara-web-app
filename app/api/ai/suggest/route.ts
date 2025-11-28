/**
 * AI Subtask Suggestions API Route
 * 
 * POST /api/ai/suggest
 * 
 * Generates subtask suggestions for a given task using AI.
 * Automatically selects between Gemini (global) and Zhipu (China) based on config.
 */

import { NextRequest, NextResponse } from 'next/server';
import { suggestSubtasks, isAIAvailable } from '@/lib/ai';

interface RequestBody {
  taskText: string;
  existingSubtasks?: string[];
  locale?: string;
  toneStyle?: 'gentle' | 'concise' | 'coach' | 'silent';
}

export async function POST(request: NextRequest) {
  // Check if AI is available
  if (!isAIAvailable()) {
    return NextResponse.json(
      {
        suggestions: [],
        success: false,
        error: 'AI service not configured',
      },
      { status: 503 }
    );
  }

  try {
    const body: RequestBody = await request.json();

    // Validate request
    if (!body.taskText || typeof body.taskText !== 'string') {
      return NextResponse.json(
        {
          suggestions: [],
          success: false,
          error: 'taskText is required',
        },
        { status: 400 }
      );
    }

    // Clean input
    const taskText = body.taskText.trim();
    if (taskText.length === 0) {
      return NextResponse.json(
        {
          suggestions: [],
          success: false,
          error: 'taskText cannot be empty',
        },
        { status: 400 }
      );
    }

    if (taskText.length > 500) {
      return NextResponse.json(
        {
          suggestions: [],
          success: false,
          error: 'taskText too long (max 500 characters)',
        },
        { status: 400 }
      );
    }

    // Get suggestions
    const result = await suggestSubtasks({
      taskText,
      existingSubtasks: body.existingSubtasks,
      locale: body.locale,
      toneStyle: body.toneStyle,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] Error in /api/ai/suggest:', error);
    return NextResponse.json(
      {
        suggestions: [],
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// Return 405 for other methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

