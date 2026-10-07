import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getMembers, getCurrentStaff, hasRole, getActivePlans } from '@novafit/supabase'
import { BottomNav } from '@/components/BottomNav'
import { StatusDateFilters } from '@/components/StatusDateFilters'
import { MemberSortDropdown } from './MemberSortDropdown'
import { formatDateTime, formatDateOnly } from '@novafit/supabase/src/utils/date'

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}


export default async function MembersPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams
  const search = typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q : undefined
  const status = typeof resolvedSearchParams.status === 'string' ? resolvedSearchParams.status : undefined
  
  const startDate = typeof resolvedSearchParams.startDate === 'string' ? resolvedSearchParams.startDate : ''
  const endDate = typeof resolvedSearchParams.endDate === 'string' ? resolvedSearchParams.endDate : ''
  const sort_by = typeof resolvedSearchParams.sort_by === 'string' ? resolvedSearchParams.sort_by : 'created_at'
  const order = typeof resolvedSearchParams.order === 'string' && resolvedSearchParams.order === 'asc' ? 'asc' : 'desc'
  const plan_id = typeof resolvedSearchParams.plan_id === 'string' ? resolvedSearchParams.plan_id : undefined

  const supabase = await createClient()
  
  // RBAC Check
  const staff = await getCurrentStaff(supabase)
  if (!staff || !(await hasRole(staff, 'manage_members'))) {
    redirect('/dashboard')
  }

  const { members, total } = await getMembers(supabase, { limit: 50, search, status, plan_id, startDate, endDate, sort_by, order })
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
            defaultStart=""
            defaultEnd=""
            searchPlaceholder="Buscar por nombre, ID o teléfono..."
            totalResults={total}
            plans={plans}
          />
        </div>

        <div className="flex mb-4">
          <MemberSortDropdown sort_by={sort_by} order={order} params={resolvedSearchParams} />
        </div>

        <div className="flex flex-col gap-3">
          {members.map((member: any) => {
            // Find the most recent plan regardless of status to display the plan name
            const displayPlan = member.active_plan || 
              (member.member_plans && member.member_plans.length > 0 
                ? [...member.member_plans].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] 
                : null);

            return (
              <Link key={member.id} href={`/members/${member.id}`} className="glass p-4 flex justify-between items-start hover-lift group">
                <div className="flex-1">
                  <div className="font-semibold group-hover:text-accent transition-colors">{member.name}</div>
                  <div className="text-sm text-muted-foreground mt-0.5">
                    {member.username} {member.phone && `• ${member.phone}`}
                  </div>
                  
                  <div className="flex flex-col gap-1 mt-3">
                    <div className="text-[10px] text-muted-foreground">
                      <span className="font-medium text-white/70">Registrado el:</span> {formatDateTime(member.created_at)} por {member.creator?.name || 'Sistema'}
                    </div>
                    {displayPlan?.starts_at && (
                      <div className="text-[10px] text-muted-foreground">
                        <span className="font-medium text-white/70">Inicio de plan:</span> {formatDateOnly(displayPlan.starts_at)}
                        {displayPlan.expiration_date && (
                          <> <span className="font-medium text-white/70 ml-2">• Expira:</span> {formatDateOnly(displayPlan.expiration_date)}</>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <StatusBadge status={member.status} />
                  
                  {displayPlan && (
                    <div className="text-xs font-medium mt-1">
                      {displayPlan.plan?.description}
                    </div>
                  )}

                  {member.active_plan && (
                    <div className="text-sm font-medium mt-1">
                      {member.active_plan.visits_remaining} / {member.active_plan.visits_purchased} <span className="text-muted-foreground text-xs font-normal">días disponibles</span>
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
          
          {members.length === 0 && (
            <div className="text-center p-8 text-muted-foreground">
              No hay miembros registrados aún.
            </div>
          )}
        </div>
      </main>
      
      <BottomNav currentPath="/members" />
    </div>
  )
}

function StatusBadge({ status }: { status: any }) {
  if (status === 'active') return <span className="badge badge-active">Activo</span>
  if (status === 'low_balance') return <span className="badge badge-warning">Por expirar</span>
  if (status === 'expired') return <span className="badge badge-expired">Expirado</span>
  return <span className="badge badge-no-plan">Sin Plan</span>
}
