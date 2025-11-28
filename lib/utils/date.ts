/**
 * Date Utilities
 * 
 * Centralized date handling using date-fns to avoid timezone issues.
 * 
 * Key principles:
 * - Store timestamps in ISO 8601 UTC format (e.g., "2024-11-28T10:30:00.000Z")
 * - Store date-only values as YYYY-MM-DD (e.g., "2024-11-28")
 * - Display using user's local timezone
 */

import {
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
  isTomorrow,
  parse,
  startOfDay,
  addDays,
  isSameDay,
  parseISO,
} from 'date-fns';

/**
 * Parse a YYYY-MM-DD date string as local date (not UTC)
 * This avoids the timezone issue where "2024-11-28" becomes Nov 27 in some timezones
 */
export function parseLocalDate(dateStr: string): Date {
  return parse(dateStr, 'yyyy-MM-dd', new Date());
}

/**
 * Get today's date as YYYY-MM-DD string
 */
export function getTodayDateString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/**
 * Format a YYYY-MM-DD date string for display
 * Returns "Today", "Yesterday", or formatted date
 */
export function formatDateForDisplay(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  
  if (isToday(date)) {
    return 'Today';
  }
  if (isYesterday(date)) {
    return 'Yesterday';
  }
  
  return format(date, 'EEE, MMM d'); // e.g., "Mon, Nov 28"
}

/**
 * Format a YYYY-MM-DD date string for full display
 */
export function formatDateFull(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  return format(date, 'EEEE, MMMM d, yyyy'); // e.g., "Monday, November 28, 2024"
}

/**
 * Format an ISO timestamp for time display
 * e.g., "10:30 AM"
 */
export function formatTime(isoTimestamp: string): string {
  const date = parseISO(isoTimestamp);
  return format(date, 'h:mm a');
}

/**
 * Format an ISO timestamp for full datetime display
 */
export function formatDateTime(isoTimestamp: string): string {
  const date = parseISO(isoTimestamp);
  return format(date, 'MMM d, yyyy h:mm a'); // e.g., "Nov 28, 2024 10:30 AM"
}

/**
 * Format due date for task display
 * Returns "Today", "Tomorrow", "Overdue", or formatted date
 */
export function formatDueDate(dateStr: string): string {
  const date = parseLocalDate(dateStr);
  const today = startOfDay(new Date());
  
  if (isSameDay(date, today)) {
    return 'Today';
  }
  if (isTomorrow(date)) {
    return 'Tomorrow';
  }
  if (date < today) {
    return format(date, 'MMM d'); // Show date for overdue
  }
  
  return format(date, 'MMM d'); // e.g., "Nov 28"
}

/**
 * Check if a YYYY-MM-DD date is overdue (before today)
 */
export function isOverdue(dateStr: string): boolean {
  const date = parseLocalDate(dateStr);
  const today = startOfDay(new Date());
  return date < today;
}

/**
 * Check if a YYYY-MM-DD date is today
 */
export function isDateToday(dateStr: string): boolean {
  const date = parseLocalDate(dateStr);
  return isToday(date);
}

/**
 * Check if a YYYY-MM-DD date is tomorrow
 */
export function isDateTomorrow(dateStr: string): boolean {
  const date = parseLocalDate(dateStr);
  return isTomorrow(date);
}

/**
 * Get relative time from now (e.g., "2 hours ago", "in 3 days")
 */
export function getRelativeTime(isoTimestamp: string): string {
  const date = parseISO(isoTimestamp);
  return formatDistanceToNow(date, { addSuffix: true });
}

/**
 * Get the next occurrence of a weekday
 * @param weekday 0 = Sunday, 1 = Monday, ..., 6 = Saturday
 */
export function getNextWeekday(weekday: number): Date {
  const today = new Date();
  const todayWeekday = today.getDay();
  let daysUntil = weekday - todayWeekday;
  if (daysUntil <= 0) {
    daysUntil += 7;
  }
  return addDays(today, daysUntil);
}

/**
 * Format date as YYYY-MM-DD for storage
 */
export function toDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Get current ISO timestamp for storage
 */
export function now(): string {
  return new Date().toISOString();
}

