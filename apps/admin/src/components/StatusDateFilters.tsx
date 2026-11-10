'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useState, useEffect, useTransition, useRef } from 'react'
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

  const isFirstRender = useRef(true)

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

  useEffect(() => {
    // When onFilterChange is provided, trigger callback instead of pushing to URL
    if (onFilterChange) {
      if (isFirstRender.current) {
        isFirstRender.current = false
        return
      }

      const timeout = setTimeout(() => {
        onFilterChange({
          startDate: startDate !== null ? startDate : defaultStart,
          endDate: endDate !== null ? endDate : defaultEnd,
          status,
          plan_id: planId,
          dateType,
          q: query,
        })
      }, 300)

      return () => clearTimeout(timeout)
    }

    // If param is null, it means it's not in the URL, but the component initializes with defaultStart/defaultEnd
    const currentStart = searchParams.get('startDate') !== null ? searchParams.get('startDate') : defaultStart
    const currentEnd = searchParams.get('endDate') !== null ? searchParams.get('endDate') : defaultEnd
    const currentStatus = searchParams.get('status') || ''
    const currentPlanId = searchParams.get('plan_id') || ''
    const currentDateType = (searchParams.get('dateType') as 'starts_at' | 'created_at') || defaultDateType
    const currentQ = searchParams.get('q') || ''

    if (startDate === currentStart && endDate === currentEnd && status === currentStatus && planId === currentPlanId && dateType === currentDateType && query === currentQ) return

    const timeout = setTimeout(() => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString())
        
        lastPushed.current = {
          q: query,
          status: status,
          plan_id: planId,
          dateType: dateType,
          startDate: startDate !== null ? startDate : defaultStart,
          endDate: endDate !== null ? endDate : defaultEnd
        }

        // We set explicitly to support empty strings for clearing the date
        if (startDate !== null && startDate !== '') params.set('startDate', startDate)
        else if (startDate === '') params.set('startDate', '')
        
        if (endDate !== null && endDate !== '') params.set('endDate', endDate)
        else if (endDate === '') params.set('endDate', '')
        
        if (status) params.set('status', status)
        else params.delete('status')

        if (planId) params.set('plan_id', planId)
        else params.delete('plan_id')

        if (showDateTypeFilter) {
          if (dateType && dateType !== defaultDateType) params.set('dateType', dateType)
          else params.delete('dateType')
        }

        if (query) params.set('q', query)
        else params.delete('q')

        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
      })
    }, 300)

    return () => clearTimeout(timeout)
  }, [startDate, endDate, status, planId, dateType, query, pathname, router, searchParams, defaultStart, defaultEnd, showDateTypeFilter, defaultDateType, onFilterChange])

  const handleReset = () => {
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
        return;
      case 'custom':
        return;
    }

    if (start && end) {
      setStartDate(format(start, 'yyyy-MM-dd'));
      setEndDate(format(end, 'yyyy-MM-dd'));
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
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="flex gap-2 flex-wrap text-sm">
        {showDateTypeFilter && (
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs text-muted-foreground ml-1">Filtrar fecha por</label>
            <select 
              className="input h-10 w-full appearance-none bg-surface/50"
              value={dateType}
              onChange={(e) => setDateType(e.target.value as 'starts_at' | 'created_at')}
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
              setStartDate(e.target.value)
              setSelectedRange('custom')
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
              onChange={(e) => setPlanId(e.target.value)}
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
