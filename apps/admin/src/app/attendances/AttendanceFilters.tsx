'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useState, useEffect, useTransition } from 'react'

export function AttendanceFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  
  const todayStr = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD local timezone
  const [startDate, setStartDate] = useState(searchParams.get('startDate') ?? todayStr)
  const [endDate, setEndDate] = useState(searchParams.get('endDate') ?? todayStr)
  const [status, setStatus] = useState(searchParams.get('status') || '')

  useEffect(() => {
    const currentStart = searchParams.get('startDate') || ''
    const currentEnd = searchParams.get('endDate') || ''
    const currentStatus = searchParams.get('status') || ''

    if (startDate === currentStart && endDate === currentEnd && status === currentStatus) return

    const timeout = setTimeout(() => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString())
        
        if (startDate) params.set('startDate', startDate)
        else params.delete('startDate')
        
        if (endDate) params.set('endDate', endDate)
        else params.delete('endDate')
        
        if (status) params.set('status', status)
        else params.delete('status')

        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
      })
    }, 300)

    return () => clearTimeout(timeout)
  }, [startDate, endDate, status, pathname, router, searchParams])

  return (
    <div className="flex gap-2 flex-wrap text-sm relative">
      <div className="flex-1 min-w-[120px]">
        <label className="text-xs text-muted-foreground ml-1">Desde</label>
        <input 
          type="date" 
          className="input h-10 w-full"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>
      <div className="flex-1 min-w-[120px]">
        <label className="text-xs text-muted-foreground ml-1">Hasta</label>
        <input 
          type="date" 
          className="input h-10 w-full"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>
      <div className="flex-1 min-w-[120px]">
        <label className="text-xs text-muted-foreground ml-1">Estado del plan</label>
        <select 
          className="input h-10 w-full appearance-none bg-surface/50"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Todos</option>
          <option value="active">Activo</option>
          <option value="low_balance">Por expirar</option>
          <option value="expired">Expirado</option>
          <option value="no_plan">Sin Plan</option>
        </select>
      </div>
      {isPending && (
        <div className="absolute right-0 top-0 -mt-2 -mr-2">
           <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  )
}
