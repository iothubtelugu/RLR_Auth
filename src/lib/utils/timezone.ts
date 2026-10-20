import { format, parseISO, differenceInMinutes, differenceInSeconds } from 'date-fns';
import { toZonedTime, format as formatZoned } from 'date-fns-tz';

export const TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Kolkata';

/**
 * Returns current timestamp in ISO 8601 string
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Returns today's date formatted as YYYY-MM-DD in Asia/Kolkata
 */
export function getZonedDateString(date: Date = new Date()): string {
  const zoned = toZonedTime(date, TIMEZONE);
  return formatZoned(zoned, 'yyyy-MM-dd', { timeZone: TIMEZONE });
}

/**
 * Formats an ISO string or Date to a readable time (e.g. 02:45 PM IST)
 */
export function formatTimeIST(dateInput: string | Date | null): string {
  if (!dateInput) return '—';
  try {
    const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
    const zoned = toZonedTime(date, TIMEZONE);
    return formatZoned(zoned, 'hh:mm:ss a', { timeZone: TIMEZONE });
  } catch {
    return '—';
  }
}

/**
 * Formats an ISO string or Date to a readable date (e.g. 20 Oct 2026)
 */
export function formatDateIST(dateInput: string | Date | null): string {
  if (!dateInput) return '—';
  try {
    const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
    const zoned = toZonedTime(date, TIMEZONE);
    return formatZoned(zoned, 'dd MMM yyyy', { timeZone: TIMEZONE });
  } catch {
    return '—';
  }
}

/**
 * Formats an ISO string or Date to full date & time (e.g. 20 Oct 2026, 02:45 PM)
 */
export function formatDateTimeIST(dateInput: string | Date | null): string {
  if (!dateInput) return '—';
  try {
    const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
    const zoned = toZonedTime(date, TIMEZONE);
    return formatZoned(zoned, 'dd MMM yyyy, hh:mm a', { timeZone: TIMEZONE });
  } catch {
    return '—';
  }
}

/**
 * Computes human readable time elapsed since entry (e.g. "1h 45m" or "25m" or "< 1m")
 */
export function formatDurationElapsed(entryIsoString: string | null): string {
  if (!entryIsoString) return '0m';
  try {
    const entryDate = parseISO(entryIsoString);
    const now = new Date();
    const totalMinutes = differenceInMinutes(now, entryDate);

    if (totalMinutes < 1) {
      const seconds = Math.max(0, differenceInSeconds(now, entryDate));
      return `${seconds}s`;
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  } catch {
    return '—';
  }
}

/**
 * Computes duration between two ISO timestamps in minutes
 */
export function calculateDurationMinutes(startIso: string, endIso: string): number {
  try {
    const start = parseISO(startIso);
    const end = parseISO(endIso);
    return Math.max(0, differenceInMinutes(end, start));
  } catch {
    return 0;
  }
}
