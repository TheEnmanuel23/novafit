import { cookies } from 'next/headers'

export function getAppDate(): Date {
  if (process.env.NODE_ENV !== 'production') {
    try {
      if (typeof window !== 'undefined') {
        const match = document.cookie.match(/(?:^|; )x-simulated-date=([^;]*)/)
        if (match && match[1]) {
          const date = new Date(decodeURIComponent(match[1]))
          if (!isNaN(date.getTime())) return date
        }
      } else {
        const store = cookies()
        const simulated = store.get('x-simulated-date')?.value
        if (simulated) {
          const date = new Date(simulated)
          if (!isNaN(date.getTime())) return date
        }
      }
    } catch (e) {
      // Ignore errors if cookies() is called outside request context
    }
  }
  return new Date()
}
