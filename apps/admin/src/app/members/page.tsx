import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMembers, getCurrentStaff, hasRole, getActivePlans } from '@novafit/supabase'
import { parseISO, startOfMonth, endOfMonth, format } from 'date-fns'
import { BottomNav } from '@/components/BottomNav'
import { StatusDateFilters } from '@/components/StatusDateFilters'
import { getTodayYYYYMMDD } from '@novafit/supabase/src/utils/date'
import { MembersList } from './MembersList'

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function MembersPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams
  const search = typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q : undefined
  const rawStatus = typeof resolvedSearchParams.status === 'string' ? resolvedSearchParams.status : undefined

  // Default filter: "Fecha de registro" + "Este mes"
  const today = parseISO(getTodayYYYYMMDD())
  const defaultStart = format(startOfMonth(today), 'yyyy-MM-dd')
  const defaultEnd = format(endOfMonth(today), 'yyyy-MM-dd')

  const rawStart = typeof resolvedSearchParams.startDate === 'string' ? resolvedSearchParams.startDate : defaultStart
  const rawEnd = typeof resolvedSearchParams.endDate === 'string' ? resolvedSearchParams.endDate : defaultEnd
  const rawDateType = resolvedSearchParams.dateType === 'starts_at' ? 'starts_at' : 'created_at'
  const rawPlanId = typeof resolvedSearchParams.plan_id === 'string' ? resolvedSearchParams.plan_id : undefined

  // When searching, ignore all filters so the search covers every member
  const isSearching = !!search
  const status = isSearching ? undefined : rawStatus
  const startDate = isSearching ? '' : rawStart
  const endDate = isSearching ? '' : rawEnd
  const dateType = rawDateType
  const plan_id = isSearching ? undefined : rawPlanId

  const supabase = await createClient()
  
  // RBAC Check
  const staff = await getCurrentStaff(supabase)
  if (!staff || !(await hasRole(staff, 'manage_members'))) {
    redirect('/dashboard')
  }

  const { members, total } = await getMembers(supabase, { limit: 50, search, status, plan_id, startDate, endDate, dateType })
  const plans = await getActivePlans(supabase)

  return (
    <div className="app-container">
      <header className="page-header justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Miembros</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {total} registrados
          </p>
        </div>
        <Link href="/members/new" className="btn btn-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          Nuevo
        </Link>
      </header>

      <main className="page-content mt-6">
        <div className="glass p-4 mb-6">
          <StatusDateFilters 
            dateLabelStart="Inicio de Plan Desde" 
            dateLabelEnd="Inicio de Plan Hasta" 
            defaultStart={defaultStart}
            defaultEnd={defaultEnd}
            defaultDateType="created_at"
            searchPlaceholder="Buscar por nombre, ID o teléfono..."
            totalResults={total}
            plans={plans}
            showDateTypeFilter
          />
        </div>

        <MembersList members={members} />
      </main>
      
      <BottomNav currentPath="/members" />
    </div>
  )
}
