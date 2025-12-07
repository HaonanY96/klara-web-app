/**
 * AI Client Service
 *
 * Frontend client for calling AI API routes.
 */

import { getDb } from '@/lib/db';
import { buildTaskSignature } from '@/lib/utils/taskSignature';
import type { ToneStyle, InferredStateType } from '@/types';

type RateBucket = 'perTask5m' | 'perTask1h' | 'perUser1m' | 'perUser1h';
type RateLimitMap = Record<RateBucket, Map<string, number[]>>;

interface SuggestSubtasksParams {
  taskText: string;
  existingSubtasks?: string[];
  toneStyle?: ToneStyle;
  inferredState?: InferredStateType;
  /** Optional task id to scope cache / rate limits */
  taskId?: string;
  /** Optional precomputed signature (text + importance + urgency + dueDate) */
  taskSignature?: string;
  /** Enable dev-only cache toast/debug (caller decides UI) */
  enableDebugToast?: boolean;
}

interface SuggestSubtasksResult {
  suggestions: string[];
  success: boolean;
  error?: string;
  /** Whether served from cache (for dev debug UI) */
  fromCache?: boolean;
  /** Whether blocked by local rate limit */
  rateLimited?: boolean;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const N_RETRY = 2; // total attempts = 1 + N_RETRY

const rateLimits: RateLimitMap = {
  perTask5m: new Map(),
  perTask1h: new Map(),
  perUser1m: new Map(),
  perUser1h: new Map(),
};

const RATE_CONFIG = {
  perTask5m: { windowMs: 5 * 60 * 1000, max: 1 },
  perTask1h: { windowMs: 60 * 60 * 1000, max: 3 },
  perUser1m: { windowMs: 60 * 1000, max: 3 },
  perUser1h: { windowMs: 60 * 60 * 1000, max: 10 },
} as const;

const inFlight = new Map<string, Promise<SuggestSubtasksResult>>();

function getSignatureFromParams(params: SuggestSubtasksParams): string | null {
  if (params.taskSignature) return params.taskSignature;
  // Fallback minimal signature (text only) if caller didn't provide rich signature
  return buildTaskSignature({
    text: params.taskText,
    importance: 'high',
    urgency: 'high',
    dueDate: null,
  });
}

function buildRateKey(params: SuggestSubtasksParams): { taskKey: string; userKey: string } {
  const taskKey = params.taskSignature || params.taskId || params.taskText;
  const userKey = 'user-default'; // No auth, single-device scope
  return { taskKey, userKey };
}

function withinLimit(bucket: RateBucket, key: string): boolean {
  const cfg = RATE_CONFIG[bucket];
  const now = Date.now();
  const entries = rateLimits[bucket].get(key) ?? [];
  const valid = entries.filter(ts => now - ts <= cfg.windowMs);
  if (valid.length >= cfg.max) {
    rateLimits[bucket].set(key, valid);
    return false;
  }
  valid.push(now);
  rateLimits[bucket].set(key, valid);
  return true;
}

function checkRateLimits(params: SuggestSubtasksParams): { ok: boolean; message?: string } {
  const { taskKey, userKey } = buildRateKey(params);

  if (!withinLimit('perTask5m', taskKey)) {
    return {
      ok: false,
      message: "This task just asked AI. Give it a few minutes and try again.",
    };
  }
  if (!withinLimit('perTask1h', taskKey)) {
    return {
      ok: false,
      message: "This task hit its hourly AI limit. Try again later.",
    };
  }
  if (!withinLimit('perUser1m', userKey)) {
    return {
      ok: false,
      message: "AI is taking a short breather. Please retry in a moment.",
    };
  }
  if (!withinLimit('perUser1h', userKey)) {
    return {
      ok: false,
      message: "You reached the hourly AI limit. Please try again later.",
    };
  }

  return { ok: true };
}

async function getCachedSuggestions(
  taskId: string | undefined,
  signature: string | null
): Promise<SuggestSubtasksResult | null> {
  if (!taskId || !signature) return null;
  const db = getDb();
  const record = await db.aiSuggestions.where('taskId').equals(taskId).first();
  if (!record) return null;

  const now = Date.now();
  const expired = record.expiresAt ? now > new Date(record.expiresAt).getTime() : false;
  const signatureMatch = record.taskSignature === signature;
  if (!signatureMatch || expired) {
    await db.aiSuggestions.delete(record.id);
    return null;
  }

  return {
    suggestions: record.suggestions,
    success: true,
    fromCache: true,
  };
}

async function saveSuggestions(
  taskId: string | undefined,
  signature: string | null,
  suggestions: string[]
): Promise<void> {
  if (!taskId || !signature || suggestions.length === 0) return;
  const db = getDb();
  const nowIso = new Date().toISOString();
  const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();
  await db.aiSuggestions.put({
    id: `${taskId}-ai-suggestion`,
    taskId,
    suggestions,
    taskSignature: signature,
    status: 'active',
    createdAt: nowIso,
    expiresAt,
  });
}

async function fetchWithRetry(
  params: SuggestSubtasksParams,
  signal?: AbortSignal
): Promise<SuggestSubtasksResult> {
  const attempt = async (): Promise<SuggestSubtasksResult> => {
    const response = await fetch('/api/ai/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskText: params.taskText,
        existingSubtasks: params.existingSubtasks,
        toneStyle: params.toneStyle,
        inferredState: params.inferredState,
      }),
      signal,
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
  };

  let lastError: SuggestSubtasksResult | null = null;
  for (let i = 0; i <= N_RETRY; i++) {
    const result = await attempt();
    if (result.success) return result;

    // Retry only for network/5xx hinted errors
    const isRetryable =
      !result.error ||
      result.error.toLowerCase().includes('network') ||
      result.error.startsWith('HTTP 5');
    if (!isRetryable) return result;

    lastError = result;
    if (i < N_RETRY) {
      const backoffMs = Math.round(300 * Math.pow(3, i) * (1 + Math.random() * 0.2));
      await new Promise(res => setTimeout(res, backoffMs));
    }
  }
  return lastError || { suggestions: [], success: false, error: 'Unknown error' };
}

/**
 * Request subtask suggestions from the AI API
 */
export async function requestAISuggestions(
  params: SuggestSubtasksParams
): Promise<SuggestSubtasksResult> {
  const signature = getSignatureFromParams(params);
  const cacheHit = await getCachedSuggestions(params.taskId, signature);
  if (cacheHit) {
    return cacheHit;
  }

  const rateCheck = checkRateLimits(params);
  if (!rateCheck.ok) {
    return {
      suggestions: [],
      success: false,
      error: rateCheck.message,
      rateLimited: true,
    };
  }

  const inflightKey = params.taskSignature || params.taskId || params.taskText;
  if (inFlight.has(inflightKey)) {
    return inFlight.get(inflightKey)!;
  }

  const promise = (async () => {
    const result = await fetchWithRetry(params);
    if (result.success) {
      await saveSuggestions(params.taskId, signature, result.suggestions);
      return { ...result, fromCache: false };
    }
    return result;
  })();

  inFlight.set(inflightKey, promise);
  const finalResult = await promise.finally(() => inFlight.delete(inflightKey));
  return finalResult;
}

/**
 * Check if AI should be called for this task
 * Returns true for tasks that would benefit from decomposition
 */
export function shouldSuggestSubtasks(taskText: string): boolean {
  const text = taskText.toLowerCase();

  // Tasks that typically need decomposition
  const complexKeywords = [
    'plan',
    'organize',
    'prepare',
    'create',
    'build',
    'develop',
    'launch',
    'design',
    'implement',
    'research',
    'analyze',
    'write',
    'complete',
    'finish',
    'project',
    'trip',
    'event',
    'meeting',
    'presentation',
    'report',
    'strategy',
  ];

  // Check if task contains complex keywords
  const hasComplexKeyword = complexKeywords.some(kw => text.includes(kw));

  // Check if task is long enough to warrant decomposition
  const isLongEnough = taskText.length > 15;

  return hasComplexKeyword || isLongEnough;
}
