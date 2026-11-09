import { addDays, format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'

export const APP_TIMEZONE = 'America/Managua'

/**
 * Current instant. Every "now" in the app uses the real clock.
 * Kept async so existing callers (`await getAppDate()`) keep working.
 */
export async function getAppDate(): Promise<Date> {
  return new Date()
}

/**
 * Returns a date formatted as YYYY-MM-DD in the given timezone (defaults to America/Managua).
 * Safe for lexicographical comparisons (e.g. '2026-10-06' < '2026-10-07') and <input type="date">.
 */
export function toTimezoneYYYYMMDD(dateInput: string | Date, timeZone: string = APP_TIMEZONE): string {
  return formatInTimeZone(dateInput, timeZone, 'yyyy-MM-dd')
}

/** Today's calendar day in Nicaragua (America/Managua) as YYYY-MM-DD. */
export function getTodayYYYYMMDD(now: Date = new Date()): string {
  return formatInTimeZone(now, APP_TIMEZONE, 'yyyy-MM-dd')
}

/**
 * Extracts the YYYY-MM-DD calendar date of a plan period field (`starts_at` / `expiration_date`),
 * which are stored as UTC calendar days.
 */
export function toPeriodYYYYMMDD(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return ''
  return formatInTimeZone(dateInput, 'UTC', 'yyyy-MM-dd')
}

/**
 * Parses a YYYY-MM-DD string into the saved start representation of a period date:
 * midnight UTC of that day (e.g. "2026-09-18" -> 2026-09-18T00:00:00.000Z).
 */
export function parseDateOnly(dateStr: string): Date {
  return fromZonedTime(`${dateStr}T00:00:00.000`, 'UTC')
}

/**
 * Parses a YYYY-MM-DD string into the saved end representation of a period date:
 * end of day UTC (e.g. "2026-09-18" -> 2026-09-18T23:59:59.999Z).
 */
export function parseDateEnd(dateStr: string): Date {
  return fromZonedTime(`${dateStr}T23:59:59.999`, 'UTC')
}

/**
 * Expiration date of a plan: the saved start date + N calendar days using date-fns `addDays`,
 * stored at the end of that UTC day (23:59:59.999Z).
 * Example: 2026-09-18 + 45 days -> 2026-11-02T23:59:59.999Z.
 */
export function calcExpirationDate(startsAt: Date | string, days: number): Date {
  const startYmd =
    typeof startsAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(startsAt)
      ? startsAt
      : formatInTimeZone(startsAt, 'UTC', 'yyyy-MM-dd')
  const expDate = addDays(parseISO(startYmd), Math.max(0, days))
  return parseDateEnd(format(expDate, 'yyyy-MM-dd'))
}

/**
 * Start (UTC midnight) of today's Nicaragua calendar day. Use it to compare against period dates
 * (`starts_at` / `expiration_date`), which are saved as UTC days.
 */
export function getTodayPeriodStartISO(now: Date = new Date()): string {
  return parseDateOnly(getTodayYYYYMMDD(now)).toISOString()
}

/** Start/end instants (UTC) of a Nicaragua calendar day (YYYY-MM-DD) in America/Managua (UTC-6). */
export function getManaguaDayRange(dateStr: string): { start: Date; end: Date } {
  return {
    start: fromZonedTime(`${dateStr}T00:00:00.000`, APP_TIMEZONE),
    end: fromZonedTime(`${dateStr}T23:59:59.999`, APP_TIMEZONE),
  }
}

/** Start/end instants (UTC) of a period calendar day (YYYY-MM-DD) for `starts_at` / `expiration_date`. */
export function getPeriodDayRange(dateStr: string): { start: Date; end: Date } {
  return {
    start: parseDateOnly(dateStr),
    end: parseDateEnd(dateStr),
  }
}

/**
 * Formats an event timestamp (`created_at`, `scanned_at`, `updated_at`) into a readable date and time
 * in the Managua timezone using date-fns-tz.
 * Example: "5 oct 2026, 06:14 p. m."
 */
export function formatDateTime(dateString: string | Date | null | undefined): string {
  if (!dateString) return 'N/A'
  return formatInTimeZone(dateString, APP_TIMEZONE, 'd MMM yyyy, hh:mm a', { locale: es })
}

/**
 * Formats a period date (`starts_at` / `expiration_date`) without timezone shift using date-fns-tz.
 * Example: "5/10/2026"
 */
export function formatDateOnly(dateString: string | Date | null | undefined): string {
  if (!dateString) return 'N/A'
  return formatInTimeZone(dateString, 'UTC', 'd/M/yyyy', { locale: es })
}

/**
 * Formats a timestamp or date into a long Spanish date in the given timezone (defaults to America/Managua).
 * Example: "9 de noviembre de 2026"
 */
export function formatLongDate(
  dateString: string | Date | null | undefined,
  timeZone: string = APP_TIMEZONE
): string {
  if (!dateString) return 'N/A'
  return formatInTimeZone(dateString, timeZone, "d 'de' MMMM 'de' yyyy", { locale: es })
}
