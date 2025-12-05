/**
 * Data Export Service
 *
 * Provides export functionality for tasks and reflections.
 */

import { exportAllData } from '@/lib/db';
import { format } from 'date-fns';
import { parseLocalDate, getTodayDateString, formatDateTime, formatTime } from '@/lib/utils/date';

/**
 * Export tasks as CSV
 */
export async function exportTasksAsCSV(): Promise<string> {
  const { tasks } = await exportAllData();

  // CSV Header with BOM for Excel UTF-8 compatibility
  const BOM = '\uFEFF';
  const headers = [
    'ID',
    'Task',
    'Completed',
    'Importance',
    'Urgency',
    'Due Date',
    'Pinned',
    'Focused',
    'Created',
    'Completed At',
  ];

  const rows = tasks.map(task => [
    task.id,
    escapeCSV(task.text),
    task.completed ? 'Yes' : 'No',
    task.importance,
    task.urgency,
    task.dueDate || '',
    task.isPinned ? 'Yes' : 'No',
    task.isFocused ? 'Yes' : 'No',
    formatDateForCSV(task.createdAt),
    task.completedAt ? formatDateForCSV(task.completedAt) : '',
  ]);

  const csv = BOM + [headers, ...rows].map(row => row.join(',')).join('\n');
  return csv;
}

/**
 * Export reflections as Markdown
 */
export async function exportReflectionsAsMarkdown(): Promise<string> {
  const { reflections } = await exportAllData();

  // Sort by date descending
  const sorted = [...reflections].sort(
    (a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime()
  );

  let markdown = '# My Reflections\n\n';
  markdown += `*Exported on ${format(new Date(), 'MMMM d, yyyy')}*\n\n`;
  markdown += '---\n\n';

  for (const reflection of sorted) {
    const date = format(parseLocalDate(reflection.date), 'EEEE, MMMM d, yyyy');

    markdown += `## ${date}\n\n`;

    // Process each entry in the reflection
    if (reflection.entries && reflection.entries.length > 0) {
      for (const entry of reflection.entries) {
        // Format time
        const time = formatTime(entry.recordedAt);

        markdown += `### ${time}`;

        // Add mood if present
        if (entry.mood) {
          const emoji = entry.mood === 'Flow' ? '⚡' : entry.mood === 'Drained' ? '🔋' : '☁️';
          markdown += ` ${emoji} ${entry.mood}`;
        }
        markdown += '\n\n';

        // Add prompt if present
        if (entry.prompt) {
          markdown += `> *${entry.prompt}*\n\n`;
        }

        // Add text
        if (entry.text) {
          markdown += `${entry.text}\n\n`;
        } else {
          markdown += `*Just checked in*\n\n`;
        }
      }
    }

    markdown += '---\n\n';
  }

  return markdown;
}

/**
 * Export all data as JSON
 */
export async function exportAllAsJSON(): Promise<string> {
  const data = await exportAllData();
  return JSON.stringify(data, null, 2);
}

/**
 * Trigger file download in browser
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export and download tasks as CSV
 */
export async function downloadTasksCSV(): Promise<void> {
  const csv = await exportTasksAsCSV();
  const date = getTodayDateString();
  downloadFile(csv, `klara-tasks-${date}.csv`, 'text/csv;charset=utf-8');
}

/**
 * Export and download reflections as Markdown
 */
export async function downloadReflectionsMarkdown(): Promise<void> {
  const markdown = await exportReflectionsAsMarkdown();
  const date = getTodayDateString();
  downloadFile(markdown, `klara-reflections-${date}.md`, 'text/markdown;charset=utf-8');
}

/**
 * Export and download all data as JSON
 */
export async function downloadAllJSON(): Promise<void> {
  const json = await exportAllAsJSON();
  const date = getTodayDateString();
  downloadFile(json, `klara-backup-${date}.json`, 'application/json;charset=utf-8');
}

// Helper functions

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatDateForCSV(isoString: string): string {
  return formatDateTime(isoString);
}
