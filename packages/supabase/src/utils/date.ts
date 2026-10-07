import { cookies } from 'next/headers'
import { parse } from 'date-fns'

export async function getAppDate(): Promise<Date> {
  if (process.env.NODE_ENV !== 'production') {
    try {
      const parseSimulated = (val: string) => {
        if (val.length === 10 && val.includes('-')) {
          const parsed = parse(val, 'yyyy-MM-dd', new Date())
          const date = new Date()
          date.setFullYear(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
          return date
        }
        return new Date(val)
      }

      if (typeof window !== 'undefined') {
        const match = document.cookie.match(/(?:^|; )x-simulated-date=([^;]*)/)
        if (match && match[1]) {
          const date = parseSimulated(decodeURIComponent(match[1]))
          if (!isNaN(date.getTime())) return date
        }
      } else {
        const store = await cookies()
        const simulated = store.get('x-simulated-date')?.value
        if (simulated) {
          const date = parseSimulated(simulated)
          if (!isNaN(date.getTime())) return date
        }
      }
    } catch (e: any) {
      if (e && e.digest && e.digest.includes('DYNAMIC')) {
        throw e;
      }
    }
  }
  return new Date()
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
