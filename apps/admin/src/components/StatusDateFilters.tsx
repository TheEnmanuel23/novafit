'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useState, useEffect, useTransition, useRef } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { getTodayYYYYMMDD } from '@novafit/supabase/src/utils/date'
import { parseISO, format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns'

export type FilterChangeValues = {
  startDate?: string
  endDate?: string
  status?: string
  plan_id?: string
  dateType?: 'starts_at' | 'created_at'
  q?: string
}

type StatusDateFiltersProps = {
  dateLabelStart?: string
  dateLabelEnd?: string
  defaultStart?: string
  defaultEnd?: string
  searchPlaceholder?: string
  totalResults?: number
  plans?: { id: string, description: string }[]
  showDateTypeFilter?: boolean
  defaultDateType?: 'starts_at' | 'created_at'
  onFilterChange?: (filters: FilterChangeValues) => void
  isPending?: boolean
}

export function StatusDateFilters({ 
  dateLabelStart = 'Desde', 
  dateLabelEnd = 'Hasta',
  defaultStart = '',
  defaultEnd = '',
  searchPlaceholder = 'Buscar...',
  totalResults,
  plans,
  showDateTypeFilter = false,
  defaultDateType = 'starts_at',
  onFilterChange,
  isPending: externalPending,
}: StatusDateFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [internalPending, startTransition] = useTransition()
  const isPending = externalPending !== undefined ? externalPending : internalPending
  
  // Set defaults based on props if no query params exist (or when onFilterChange is used)
  const initialStart = onFilterChange ? defaultStart : (searchParams.get('startDate') !== null ? searchParams.get('startDate') : defaultStart)
  const initialEnd = onFilterChange ? defaultEnd : (searchParams.get('endDate') !== null ? searchParams.get('endDate') : defaultEnd)
  const initialStatus = onFilterChange ? '' : (searchParams.get('status') || '')
  const initialPlanId = onFilterChange ? '' : (searchParams.get('plan_id') || '')
  const initialDateType = onFilterChange ? defaultDateType : ((searchParams.get('dateType') as 'starts_at' | 'created_at') || defaultDateType)

  const [startDate, setStartDate] = useState(initialStart ?? '')
  const [endDate, setEndDate] = useState(initialEnd ?? '')
  const [status, setStatus] = useState(initialStatus)
  const [planId, setPlanId] = useState(initialPlanId)
  const [dateType, setDateType] = useState<'starts_at' | 'created_at'>(initialDateType)
  const [query, setQuery] = useState(onFilterChange ? '' : (searchParams.get('q') || ''))
  const [selectedRange, setSelectedRange] = useState('custom')

  const lastPushed = useRef({
    q: query,
    status: initialStatus,
    plan_id: initialPlanId,
    dateType: initialDateType,
    startDate: initialStart,
    endDate: initialEnd
  })

  // Sync local state if URL changes from outside (e.g. back/forward buttons) - only when onFilterChange is NOT provided
  useEffect(() => {
    if (onFilterChange) return

    const q = searchParams.get('q') || ''
    const currentStatus = searchParams.get('status') || ''
    const currentPlanId = searchParams.get('plan_id') || ''
    const currentDateType = (searchParams.get('dateType') as 'starts_at' | 'created_at') || defaultDateType
    const currentStart = searchParams.get('startDate') !== null ? searchParams.get('startDate') : defaultStart
    const currentEnd = searchParams.get('endDate') !== null ? searchParams.get('endDate') : defaultEnd

    if (q !== lastPushed.current.q) {
      setQuery(q)
      lastPushed.current.q = q
    }
    if (currentStatus !== lastPushed.current.status) {
      setStatus(currentStatus)
      lastPushed.current.status = currentStatus
    }
    if (currentPlanId !== lastPushed.current.plan_id) {
      setPlanId(currentPlanId)
      lastPushed.current.plan_id = currentPlanId
    }
    if (currentDateType !== lastPushed.current.dateType) {
      setDateType(currentDateType)
      lastPushed.current.dateType = currentDateType
    }
    if (currentStart !== lastPushed.current.startDate) {
      setStartDate(currentStart as string)
      lastPushed.current.startDate = currentStart
    }
    if (currentEnd !== lastPushed.current.endDate) {
      setEndDate(currentEnd as string)
      lastPushed.current.endDate = currentEnd
    }
  }, [searchParams, defaultStart, defaultEnd, defaultDateType, onFilterChange])

  const emitFilters = useDebouncedCallback((next: Required<FilterChangeValues>) => {
    if (onFilterChange) {
      onFilterChange(next)
      return
    }

    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())

      lastPushed.current = {
        q: next.q,
        status: next.status,
        plan_id: next.plan_id,
        dateType: next.dateType,
        startDate: next.startDate,
        endDate: next.endDate,
      }

      if (next.startDate !== '') params.set('startDate', next.startDate)
      else params.set('startDate', '')

      if (next.endDate !== '') params.set('endDate', next.endDate)
      else params.set('endDate', '')

      if (next.status) params.set('status', next.status)
      else params.delete('status')

      if (next.plan_id) params.set('plan_id', next.plan_id)
      else params.delete('plan_id')

      if (showDateTypeFilter) {
        if (next.dateType && next.dateType !== defaultDateType) params.set('dateType', next.dateType)
        else params.delete('dateType')
      }

      if (next.q) params.set('q', next.q)
      else params.delete('q')

      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }, 300)

  const updateFilters = (overrides: Partial<FilterChangeValues>) => {
    const next = {
      startDate: overrides.startDate !== undefined ? overrides.startDate : startDate,
      endDate: overrides.endDate !== undefined ? overrides.endDate : endDate,
      status: overrides.status !== undefined ? overrides.status : status,
      plan_id: overrides.plan_id !== undefined ? overrides.plan_id : planId,
      dateType: overrides.dateType !== undefined ? overrides.dateType : dateType,
      q: overrides.q !== undefined ? overrides.q : query,
    }
    emitFilters(next)
  }

  const handleReset = () => {
    emitFilters.cancel()
    setStartDate(defaultStart as string)
    setEndDate(defaultEnd as string)
    setStatus('')
    setPlanId('')
    setDateType(defaultDateType)
    setQuery('')
    setSelectedRange('custom')

    if (onFilterChange) {
      onFilterChange({
        startDate: defaultStart as string,
        endDate: defaultEnd as string,
        status: '',
        plan_id: '',
        dateType: defaultDateType,
        q: '',
      })
      return
    }

    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (defaultStart) params.set('startDate', defaultStart)
      else params.set('startDate', '')
      
      if (defaultEnd) params.set('endDate', defaultEnd)
      else params.set('endDate', '')

      params.delete('status')
      params.delete('plan_id')
      params.delete('dateType')
      params.delete('q')

      lastPushed.current = {
        q: '',
        status: '',
        plan_id: '',
        dateType: defaultDateType,
        startDate: defaultStart,
        endDate: defaultEnd
      }

      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    })
  }

  const setDateRange = (type: string) => {
    setSelectedRange(type);
    const now = parseISO(getTodayYYYYMMDD());

    let start: Date | undefined, end: Date | undefined;

    switch (type) {
      case 'today':
        start = end = now;
        break;
      case 'yesterday':
        start = end = subDays(now, 1);
        break;
      case 'this_week':
        start = startOfWeek(now);
        end = endOfWeek(now);
        break;
      case 'last_two_weeks':
        start = subDays(now, 14);
        end = now;
        break;
      case 'this_month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'last_month': {
        const lastMonth = subMonths(now, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      }
      case 'last_two_months':
        start = startOfMonth(subMonths(now, 2));
        end = endOfMonth(now);
        break;
      case 'clear':
        setStartDate('');
        setEndDate('');
        updateFilters({ startDate: '', endDate: '' });
        return;
      case 'custom':
        return;
    }

    if (start && end) {
      const nextStart = format(start, 'yyyy-MM-dd');
      const nextEnd = format(end, 'yyyy-MM-dd');
      setStartDate(nextStart);
      setEndDate(nextEnd);
      updateFilters({ startDate: nextStart, endDate: nextEnd });
    }
  }

  const effectiveLabelStart = showDateTypeFilter
    ? (dateType === 'created_at' ? 'Registrado Desde' : 'Inicio de Plan Desde')
    : dateLabelStart
  const effectiveLabelEnd = showDateTypeFilter
    ? (dateType === 'created_at' ? 'Registrado Hasta' : 'Inicio de Plan Hasta')
    : dateLabelEnd

  return (
    <div className="flex flex-col gap-4 relative">
      <div className="relative flex-1 w-full">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <input 
          type="text" 
          className="input pl-9 h-10 w-full" 
          placeholder={searchPlaceholder} 
          value={query}
          onChange={(e) => {
            const nextQ = e.target.value
            setQuery(nextQ)
            updateFilters({ q: nextQ })
          }}
        />
      </div>

      <div className="flex gap-2 flex-wrap text-sm">
        {showDateTypeFilter && (
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs text-muted-foreground ml-1">Filtrar fecha por</label>
            <select 
              className="input h-10 w-full appearance-none bg-surface/50"
              value={dateType}
              onChange={(e) => {
                const nextType = e.target.value as 'starts_at' | 'created_at'
                setDateType(nextType)
                updateFilters({ dateType: nextType })
              }}
            >
              <option value="starts_at">Inicio de plan</option>
              <option value="created_at">Fecha de registro</option>
            </select>
          </div>
        )}
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
          <label className="text-xs text-muted-foreground ml-1">{effectiveLabelStart}</label>
          <input 
            type="date" 
            className="input h-10 w-full"
            value={startDate}
            onChange={(e) => {
              const nextStart = e.target.value
              setStartDate(nextStart)
              setSelectedRange('custom')
              updateFilters({ startDate: nextStart })
            }}
          />
        </div>
        <div className="flex-1 min-w-[120px]">
          <label className="text-xs text-muted-foreground ml-1">{effectiveLabelEnd}</label>
          <input 
            type="date" 
            className="input h-10 w-full"
            value={endDate}
            onChange={(e) => {
              const nextEnd = e.target.value
              setEndDate(nextEnd)
              setSelectedRange('custom')
              updateFilters({ endDate: nextEnd })
            }}
          />
        </div>
        <div className="flex-1 min-w-[120px]">
          <label className="text-xs text-muted-foreground ml-1">Estado del plan</label>
          <select 
            className="input h-10 w-full appearance-none bg-surface/50"
            value={status}
            onChange={(e) => {
              const nextStatus = e.target.value
              setStatus(nextStatus)
              updateFilters({ status: nextStatus })
            }}
          >
            <option value="">Todos</option>
            <option value="active">Activo</option>
            <option value="low_balance">Por expirar</option>
            <option value="scheduled">Programado</option>
            <option value="expired">Expirado</option>
            <option value="no_plan">Sin Plan</option>
          </select>
        </div>
        {plans && plans.length > 0 && (
          <div className="flex-1 min-w-[120px]">
            <label className="text-xs text-muted-foreground ml-1">Tipo de plan</label>
            <select 
              className="input h-10 w-full appearance-none bg-surface/50"
              value={planId}
              onChange={(e) => {
                const nextPlanId = e.target.value
                setPlanId(nextPlanId)
                updateFilters({ plan_id: nextPlanId })
              }}
            >
              <option value="">Todos</option>
              {plans.map(p => (
                <option key={p.id} value={p.id}>{p.description}</option>
              ))}
            </select>
          </div>
        )}
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
