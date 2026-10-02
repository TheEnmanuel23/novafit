import { parse } from 'date-fns'

export function getClientAppDate(): Date {
  let now = new Date()
  
  if (process.env.NODE_ENV !== 'production' && typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|; )x-simulated-date=([^;]*)/)
    if (match && match[1]) {
      try {
        const val = decodeURIComponent(match[1])
        
        // Handle YYYY-MM-DD format
        if (val.length === 10 && val.includes('-')) {
          const parsed = parse(val, 'yyyy-MM-dd', new Date())
          now.setFullYear(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
          return now
        }
        
        // Handle ISO string format
        const simulated = new Date(val)
        if (!isNaN(simulated.getTime())) {
          // Apply timezone offset because ISO string in cookie is UTC
          simulated.setMinutes(simulated.getMinutes() + simulated.getTimezoneOffset())
          now = simulated
        }
      } catch (e) {}
    }
  }
  
  return now
}
