'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useState, useEffect, useTransition } from 'react'

export function SearchInput({ placeholder }: { placeholder?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [query, setQuery] = useState(searchParams.get('q') || '')

  // Sync local state with URL if it changes from outside (e.g. when filters are reset)
  useEffect(() => {
    const q = searchParams.get('q') || ''
    if (q !== query) {
      setQuery(q)
    }
  }, [searchParams])

  useEffect(() => {
    const currentQ = searchParams.get('q') || ''
    if (query === currentQ) return

    const timeout = setTimeout(() => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString())
        if (query) {
          params.set('q', query)
        } else {
          params.delete('q')
        }
        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
      })
    }, 300)

    return () => clearTimeout(timeout)
  }, [query, pathname, router, searchParams])

  return (
    <div className="relative flex-1">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      <input 
        type="text" 
        className="input pl-9 border-none bg-transparent h-10 w-full focus:ring-0 shadow-none" 
        placeholder={placeholder || "Buscar..."} 
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {isPending && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  )
}
