'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useState, useEffect, useTransition } from 'react'
import { getClientAppDate } from '@novafit/supabase/src/utils/date-client'

type StatusDateFiltersProps = {
  dateLabelStart?: string
  dateLabelEnd?: string
  defaultStart?: string
  defaultEnd?: string
  searchPlaceholder?: string
  totalResults?: number
}

export function StatusDateFilters({ 
  dateLabelStart = 'Desde', 
  dateLabelEnd = 'Hasta',
  defaultStart = '',
  defaultEnd = '',
  searchPlaceholder = 'Buscar...',
  totalResults
}: StatusDateFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  
  // Set defaults based on props if no query params exist
  const initialStart = searchParams.get('startDate') !== null ? searchParams.get('startDate') : defaultStart
  const initialEnd = searchParams.get('endDate') !== null ? searchParams.get('endDate') : defaultEnd
  const initialStatus = searchParams.get('status') || ''

  const [startDate, setStartDate] = useState(initialStart ?? '')
  const [endDate, setEndDate] = useState(initialEnd ?? '')
  const [status, setStatus] = useState(initialStatus)
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [selectedRange, setSelectedRange] = useState('custom')

  // Sync local state if URL changes from outside (e.g. back/forward buttons)
  useEffect(() => {
    const q = searchParams.get('q') || ''
    if (q !== query) setQuery(q)
  }, [searchParams])

  useEffect(() => {
    // If param is null, it means it's not in the URL, but the component initializes with defaultStart/defaultEnd
    const currentStart = searchParams.get('startDate') !== null ? searchParams.get('startDate') : defaultStart
    const currentEnd = searchParams.get('endDate') !== null ? searchParams.get('endDate') : defaultEnd
    const currentStatus = searchParams.get('status') || ''
    const currentQ = searchParams.get('q') || ''

    if (startDate === currentStart && endDate === currentEnd && status === currentStatus && query === currentQ) return

    const timeout = setTimeout(() => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString())
        
        // We set explicitly to support empty strings for clearing the date
        if (startDate !== null) params.set('startDate', startDate)
        if (endDate !== null) params.set('endDate', endDate)
        
        if (status) params.set('status', status)
        else params.delete('status')

        if (query) params.set('q', query)
        else params.delete('q')

        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
      })
    }, 300)

    return () => clearTimeout(timeout)
  }, [startDate, endDate, status, query, pathname, router, searchParams, defaultStart, defaultEnd])

  const handleReset = () => {
    setStartDate(defaultStart)
    setEndDate(defaultEnd)
    setStatus('')
    setQuery('')
    setSelectedRange('custom')
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (defaultStart) params.set('startDate', defaultStart)
      else params.set('startDate', '')
      
      if (defaultEnd) params.set('endDate', defaultEnd)
      else params.set('endDate', '')

      params.delete('status')
      params.delete('q')
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }

  const setDateRange = (type: string) => {
    setSelectedRange(type);
    const now = getClientAppDate();
    const format = (d: Date) => {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    let start, end;
    
    switch(type) {
      case 'today':
        start = end = now;
        break;
      case 'yesterday':
        start = new Date(now);
        start.setDate(now.getDate() - 1);
        end = new Date(start);
        break;
      case 'this_week':
        start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        break;
      case 'last_two_weeks':
        end = new Date(now);
        start = new Date(now);
        start.setDate(now.getDate() - 14);
        break;
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'last_two_months':
        start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'clear':
        setStartDate('');
        setEndDate('');
        return;
      case 'custom':
        return;
    }
    
    if (start && end) {
      setStartDate(format(start));
      setEndDate(format(end));
    }
  }

  return (
    <div className="flex flex-col gap-4 relative">
      <div className="relative flex-1 w-full">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <input 
          type="text" 
          className="input pl-9 h-10 w-full" 
          placeholder={searchPlaceholder} 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="flex gap-2 flex-wrap text-sm">
        <div className="flex-1 min-w-[130px]">
          <label className="text-xs text-muted-foreground ml-1">Rango de fechas</label>
          <select 
            className="input h-10 w-full appearance-none bg-surface/50"
            value={selectedRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="custom">Personalizado</option>
            <option value="today">Hoy</option>
            <option value="yesterday">Ayer</option>
            <option value="this_week">Esta semana</option>
            <option value="last_two_weeks">Últimas 2 semanas</option>
            <option value="this_month">Este mes</option>
            <option value="last_month">Mes pasado</option>
            <option value="last_two_months">Últimos 2 meses</option>
            <option value="clear">Sin límite (limpiar)</option>
          </select>
        </div>
        <div className="flex-1 min-w-[120px]">
          <label className="text-xs text-muted-foreground ml-1">{dateLabelStart}</label>
          <input 
            type="date" 
            className="input h-10 w-full"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value)
              setSelectedRange('custom')
            }}
          />
        </div>
        <div className="flex-1 min-w-[120px]">
          <label className="text-xs text-muted-foreground ml-1">{dateLabelEnd}</label>
          <input 
            type="date" 
            className="input h-10 w-full"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value)
              setSelectedRange('custom')
            }}
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
        <div className="flex items-end">
          <button 
            onClick={handleReset}
            className="btn h-10 px-4 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors border border-white/10 text-xs font-medium"
          >
            Valores por defecto
          </button>
        </div>
      </div>
      {totalResults !== undefined && (
        <div className="text-xs text-muted-foreground flex justify-end">
          {totalResults} resultado{totalResults !== 1 ? 's' : ''} encontrado{totalResults !== 1 ? 's' : ''}
        </div>
      )}
      {isPending && (
        <div className="absolute right-0 top-0 -mt-2 -mr-2 z-10">
           <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  )
}
