'use client'

import { useState, useMemo, useTransition } from 'react'
import Link from 'next/link'
import { StatusDateFilters, type FilterChangeValues } from '@/components/StatusDateFilters'
import { SortDropdown } from '@/components/SortDropdown'
import { getAttendancesAction } from '@/app/actions/checkin'
import { formatDateTime } from '@novafit/supabase/src/utils/date'

const ATTENDANCE_SORT_OPTIONS = [
  { value: 'scanned_at', label: 'Fecha' },
  { value: 'name', label: 'Nombre' },
  { value: 'username', label: 'ID Usuario' },
  { value: 'plan', label: 'Plan' },
  { value: 'status', label: 'Estado' },
  { value: 'checkin_type', label: 'Método' },
  { value: 'balance_after', label: 'Balance' },
]

const STATUS_ORDER: Record<string, number> = {
  active: 1,
  low_balance: 2,
  expired: 3,
  no_plan: 4,
}

type AttendanceViewProps = {
  initialAttendances: any[]
  plans: any[]
  todayStr: string
}

export function AttendanceView({ initialAttendances, plans, todayStr }: AttendanceViewProps) {
  const [attendances, setAttendances] = useState<any[]>(initialAttendances)
  const [isPending, startTransition] = useTransition()
  const [sortBy, setSortBy] = useState<string>('scanned_at')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')

  const handleFilterChange = (filters: FilterChangeValues) => {
    startTransition(async () => {
      try {
        const data = await getAttendancesAction({
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
          status: filters.status || undefined,
          plan_id: filters.plan_id || undefined,
          search: filters.q || undefined,
        })
        setAttendances(data)
      } catch (err) {
        console.error('Error fetching attendances:', err)
      }
    })
  }

  const handleHeaderClick = (field: string) => {
    if (sortBy === field) {
      setOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortBy(field)
      setOrder('desc')
    }
  }

  const sortedAttendances = useMemo(() => {
    const isAsc = order === 'asc'
    return [...attendances].sort((a, b) => {
      if (sortBy === 'scanned_at') {
        const diff = new Date(a.scanned_at).getTime() - new Date(b.scanned_at).getTime()
        return isAsc ? diff : -diff
      }
      if (sortBy === 'balance_after') {
        const diff = (a.balance_after ?? 0) - (b.balance_after ?? 0)
        return isAsc ? diff : -diff
      }
      if (sortBy === 'status') {
        const diff = (STATUS_ORDER[a.members?.status] || 99) - (STATUS_ORDER[b.members?.status] || 99)
        return isAsc ? diff : -diff
      }
      let valA = ''
      let valB = ''
      if (sortBy === 'name' || sortBy === 'username') {
        valA = (a.members?.[sortBy] || '').toLowerCase()
        valB = (b.members?.[sortBy] || '').toLowerCase()
      } else if (sortBy === 'plan') {
        valA = (a.member_plan?.plan?.description || '').toLowerCase()
        valB = (b.member_plan?.plan?.description || '').toLowerCase()
      } else if (sortBy === 'checkin_type') {
        valA = (a.checkin_type || 'manual').toLowerCase()
        valB = (b.checkin_type || 'manual').toLowerCase()
      }
      if (valA < valB) return isAsc ? -1 : 1
      if (valA > valB) return isAsc ? 1 : -1
      return 0
    })
  }, [attendances, sortBy, order])

  return (
    <>
      <div className="glass p-4 mb-6">
        <StatusDateFilters 
          dateLabelStart="Desde"
          dateLabelEnd="Hasta"
          defaultStart={todayStr}
          defaultEnd={todayStr}
          searchPlaceholder="Buscar por nombre, ID o teléfono..."
          totalResults={sortedAttendances.length}
          plans={plans}
          onFilterChange={handleFilterChange}
          isPending={isPending}
        />
      </div>

      <div className="flex mb-4">
        <SortDropdown
          sort_by={sortBy}
          order={order}
          options={ATTENDANCE_SORT_OPTIONS}
          onSortChange={(newSortBy, newOrder) => {
            setSortBy(newSortBy)
            setOrder(newOrder)
          }}
        />
      </div>

      <div className="glass rounded-xl overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 text-xs text-muted-foreground uppercase tracking-wider bg-black/20">
              <th className="p-4 font-medium"><SortHeader label="Fecha" field="scanned_at" sortBy={sortBy} order={order} onSort={handleHeaderClick} /></th>
              <th className="p-4 font-medium"><SortHeader label="Nombre" field="name" sortBy={sortBy} order={order} onSort={handleHeaderClick} /></th>
              <th className="p-4 font-medium hidden md:table-cell"><SortHeader label="ID Usuario" field="username" sortBy={sortBy} order={order} onSort={handleHeaderClick} /></th>
              <th className="p-4 font-medium hidden lg:table-cell"><SortHeader label="Plan" field="plan" sortBy={sortBy} order={order} onSort={handleHeaderClick} /></th>
              <th className="p-4 font-medium hidden sm:table-cell"><SortHeader label="Estado" field="status" sortBy={sortBy} order={order} onSort={handleHeaderClick} /></th>
              <th className="p-4 font-medium hidden lg:table-cell"><SortHeader label="Método" field="checkin_type" sortBy={sortBy} order={order} onSort={handleHeaderClick} /></th>
              <th className="p-4 font-medium text-right"><SortHeader label="Balance" field="balance_after" sortBy={sortBy} order={order} onSort={handleHeaderClick} alignRight /></th>
            </tr>
          </thead>
          <tbody>
            {sortedAttendances.map((attendance: any) => (
              <tr key={attendance.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                <td className="p-4 whitespace-nowrap text-sm">
                  {formatDateTime(attendance.scanned_at)}
                </td>
                <td className="p-4">
                  <Link href={`/members/${attendance.members.member_id}`} className="font-semibold group-hover:text-accent transition-colors block">
                    {attendance.members.name}
                  </Link>
                  <div className="text-xs text-muted-foreground md:hidden mt-0.5">
                    ID: {attendance.members.username} • Tel: {attendance.members.phone || 'N/A'}
                  </div>
                </td>
                <td className="p-4 text-sm text-muted-foreground hidden md:table-cell">
                  {attendance.members.username}
                </td>
                <td className="p-4 text-sm hidden lg:table-cell">
                  <span className="text-muted-foreground">{attendance.member_plan?.plan?.description || 'N/A'}</span>
                </td>
                <td className="p-4 hidden sm:table-cell">
                  <StatusBadge status={attendance.members.status} />
                </td>
                <td className="p-4 hidden lg:table-cell">
                  <CheckinTypeBadge type={attendance.checkin_type || 'manual'} />
                </td>
                <td className="p-4 text-right">
                  <span className="font-bold text-sm bg-black/20 px-2 py-1 rounded border border-white/5 inline-block min-w-[3rem] text-center">
                    {attendance.balance_after}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sortedAttendances.length === 0 && (
          <div className="text-center p-8 text-muted-foreground border-t border-white/5">
            No se encontraron visitas con estos filtros.
          </div>
        )}
      </div>
    </>
  )
}

function SortHeader({
  label,
  field,
  sortBy,
  order,
  onSort,
  alignRight,
}: {
  label: string
  field: string
  sortBy: string
  order: 'asc' | 'desc'
  onSort: (field: string) => void
  alignRight?: boolean
}) {
  const isSorted = sortBy === field

  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={`flex items-center gap-1 uppercase tracking-wider hover:text-white transition-colors w-full ${isSorted ? 'text-white' : ''} ${alignRight ? 'justify-end' : ''}`}
    >
      {label}
      {isSorted ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={order === 'desc' ? 'rotate-180' : ''}>
          <path d="m6 9 6 6 6-6"/>
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 group-hover:opacity-50">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      )}
    </button>
  )
}

function StatusBadge({ status }: { status: any }) {
  if (status === 'active') return <span className="badge badge-active text-[10px]">Plan Activo</span>
  if (status === 'low_balance') return <span className="badge badge-warning text-[10px]">Por expirar</span>
  if (status === 'expired') return <span className="badge badge-expired text-[10px]">Expirado</span>
  return <span className="badge badge-no-plan text-[10px]">Sin Plan</span>
}

function CheckinTypeBadge({ type }: { type: string }) {
  if (type === 'qr') {
    return (
      <span className="badge badge-active text-[10px] flex items-center gap-1 w-max">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>
        QR
      </span>
    )
  }
  if (type === 'manual') {
    return (
      <span className="badge badge-warning text-[10px] flex items-center gap-1 w-max">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
        Manual
      </span>
    )
  }
  return (
    <span className="badge badge-no-plan text-[10px] flex items-center gap-1 w-max capitalize">
      {type}
    </span>
  )
}

