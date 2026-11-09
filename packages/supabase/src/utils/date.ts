export const APP_TIMEZONE = 'America/Managua'

/**
 * Current instant. There is no simulated/override date: every "now" in the app is the real clock.
 * Kept async so existing callers (`await getAppDate()`) keep working.
 */
export async function getAppDate(): Promise<Date> {
  return new Date()
}

/** Today's calendar day in Nicaragua as YYYY-MM-DD. */
export function getTodayYYYYMMDD(now: Date = new Date()): string {
  return toTimezoneYYYYMMDD(now, APP_TIMEZONE)
}

/**
 * Parses a YYYY-MM-DD string into the saved representation of a period date:
 * midnight UTC of that day (e.g. "2026-09-18" -> 2026-09-18T00:00:00.000Z).
 */
export function parseDateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`)
}

/**
 * Expiration date of a plan: the SAVED start date + N calendar days, computed purely in UTC
 * (no local timezone involved). Stored as the end of that UTC day (23:59:59.999Z), so the UTC
 * calendar day is always `startsAt + days`. Example: 2026-09-18 + 45 days -> 2026-11-02.
 */
export function calcExpirationDate(startsAt: Date | string, days: number): Date {
  const s = new Date(startsAt)
  return new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate() + Math.max(0, days), 23, 59, 59, 999))
}

/**
 * Start (UTC midnight) of today's Nicaragua calendar day. Use it to compare against period dates
 * (`starts_at` / `expiration_date`), which are saved as UTC days.
 */
export function getTodayPeriodStartISO(now: Date = new Date()): string {
  return parseDateOnly(getTodayYYYYMMDD(now)).toISOString()
}

/** Start/end instants (UTC) of a Nicaragua calendar day (YYYY-MM-DD). Nicaragua has no DST (UTC-6). */
export function getManaguaDayRange(dateStr: string): { start: Date; end: Date } {
  return {
    start: new Date(`${dateStr}T00:00:00.000-06:00`),
    end: new Date(`${dateStr}T23:59:59.999-06:00`),
  }
}

/**
 * Formats a timestamp into a readable date and time string in the Managua timezone.
 * Example: "5 oct 2026, 06:14"
 */
export function formatDateTime(dateString: string | Date | null | undefined): string {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleString('es-NI', {
    timeZone: 'America/Managua',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Formats a date-only string (like plan start/expiration dates) into a UTC date string to prevent timezone shifts.
 * Example: "5/10/2026"
 */
export function formatDateOnly(dateString: string | Date | null | undefined): string {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('es-NI', {
    timeZone: 'UTC'
  })
}

/**
 * Returns a date formatted as YYYY-MM-DD for a specific timezone.
 * We use 'en-CA' because it natively formats dates in YYYY-MM-DD format,
 * which is required for safe lexicographical comparisons (e.g. '2026-10-06' < '2026-10-07').
 * If we used 'es-NI', it would return '6/10/2026' which breaks string comparisons.
 */
export function toTimezoneYYYYMMDD(dateInput: string | Date, timeZone: string = 'America/Managua'): string {
  return new Date(dateInput).toLocaleDateString('en-CA', { timeZone });
}

