import type { ImportanceLevel, UrgencyLevel } from '@/types';

interface TaskSignatureInput {
  text: string;
  importance: ImportanceLevel;
  urgency: UrgencyLevel;
  dueDate: string | null;
}

/**
 * Build a deterministic signature for a task's core planning attributes.
 * Used to detect when AI suggestions are no longer in sync with the task.
 */
export function buildTaskSignature(input: TaskSignatureInput): string {
  const normalizedText = input.text.trim();
  const normalizedDate = input.dueDate ?? '';
  return `${normalizedText}|${input.importance}|${input.urgency}|${normalizedDate}`;
}

