import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getCurrentStaff, hasRole } from '@novafit/supabase'
import { getAttendances } from '@novafit/supabase/src/queries/checkin'
import { BottomNav } from '@/components/BottomNav'
import { StatusDateFilters } from '@/components/StatusDateFilters'

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function AttendancesPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams
  const search = typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q : undefined
  
  const { getAppDate } = await import('@novafit/supabase/src/utils/date')
  const appDate = await getAppDate()
  const todayStr = appDate.toISOString().split('T')[0] // YYYY-MM-DD
  const startDate = typeof resolvedSearchParams.startDate === 'string' ? resolvedSearchParams.startDate : todayStr
  const endDate = typeof resolvedSearchParams.endDate === 'string' ? resolvedSearchParams.endDate : todayStr
  const status = typeof resolvedSearchParams.status === 'string' ? resolvedSearchParams.status : undefined
  const sort_by = typeof resolvedSearchParams.sort_by === 'string' ? resolvedSearchParams.sort_by : 'scanned_at'
  const order = typeof resolvedSearchParams.order === 'string' && resolvedSearchParams.order === 'asc' ? 'asc' : 'desc'

  const supabase = await createClient()
  const supabaseAdmin = createServiceClient()
  
  const staff = await getCurrentStaff(supabase)
  if (!staff) {
    redirect('/login')
  }

  const attendances = await getAttendances(supabaseAdmin, {
    search,
    startDate,
    endDate,
    status,
    sort_by,
    order
  })

  // Format date helper
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-NI', {
      timeZone: 'America/Managua',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="app-container">
      <header className="page-header justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Registro de Visitas</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Historial de asistencias
            </p>
          </div>
        </div>
      </header>

      <main className="page-content mt-6">
        <div className="glass p-4 mb-6">
          <StatusDateFilters 
            dateLabelStart="Desde"
            dateLabelEnd="Hasta"
            defaultStart={todayStr}
            defaultEnd={todayStr}
            searchPlaceholder="Buscar por nombre, ID o teléfono..."
            totalResults={attendances.length}
          />
        </div>

        <div className="glass rounded-xl overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-xs text-muted-foreground uppercase tracking-wider bg-black/20">
                <th className="p-4 font-medium"><SortHeader label="Fecha" field="scanned_at" sort_by={sort_by} order={order} params={resolvedSearchParams} /></th>
                <th className="p-4 font-medium"><SortHeader label="Nombre" field="name" sort_by={sort_by} order={order} params={resolvedSearchParams} /></th>
                <th className="p-4 font-medium hidden md:table-cell"><SortHeader label="ID Usuario" field="username" sort_by={sort_by} order={order} params={resolvedSearchParams} /></th>
                <th className="p-4 font-medium hidden lg:table-cell">Plan</th>
                <th className="p-4 font-medium hidden sm:table-cell"><SortHeader label="Estado" field="status" sort_by={sort_by} order={order} params={resolvedSearchParams} /></th>
                <th className="p-4 font-medium hidden lg:table-cell">Método</th>
                <th className="p-4 font-medium text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {attendances.map((attendance: any) => (
                <tr key={attendance.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                  <td className="p-4 whitespace-nowrap text-sm">
                    {formatDate(attendance.scanned_at)}
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
          
          {attendances.length === 0 && (
            <div className="text-center p-8 text-muted-foreground border-t border-white/5">
              No se encontraron visitas con estos filtros.
            </div>
          )}
        </div>
      </main>
      
      <BottomNav currentPath="/attendances" />
    </div>
  )
}

function SortHeader({ label, field, sort_by, order, params }: { label: string, field: string, sort_by: string, order: 'asc'|'desc', params: any }) {
  const isSorted = sort_by === field
  const nextOrder = isSorted && order === 'desc' ? 'asc' : 'desc'
  
  const searchParams = new URLSearchParams()
  if (params.q) searchParams.set('q', params.q)
  if (params.startDate) searchParams.set('startDate', params.startDate)
  if (params.endDate) searchParams.set('endDate', params.endDate)
  if (params.status) searchParams.set('status', params.status)
  searchParams.set('sort_by', field)
  searchParams.set('order', nextOrder)

  return (
    <Link 
      href={`?${searchParams.toString()}`}
      className={`flex items-center gap-1 hover:text-white transition-colors ${isSorted ? 'text-white' : ''}`}
      scroll={false}
    >
      {label}
      {isSorted && (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={order === 'desc' ? 'rotate-180' : ''}>
          <path d="m6 9 6 6 6-6"/>
        </svg>
      )}
      {!isSorted && (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 group-hover:opacity-50">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      )}
    </Link>
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
