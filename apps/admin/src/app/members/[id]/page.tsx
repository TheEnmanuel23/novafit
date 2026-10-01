import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff, hasRole } from '@novafit/supabase'
import { getMemberById } from '@novafit/supabase/src/queries/members'
import { getActivePlans } from '@novafit/supabase/src/queries/plans'
import { getMemberPlanHistory } from '@novafit/supabase/src/queries/member-plans'
import { EditMemberModal } from '@/components/EditMemberModal'
import { DeactivateMemberButton } from '@/components/DeactivateMemberButton'
import { AssignPlanModal } from '@/components/AssignPlanModal'
import { isPlanActive, isPlanExpired } from '@novafit/supabase/src/utils/member'
import { getAppDate } from '@novafit/supabase/src/utils/date'
import { EditPlanModal } from '@/components/EditPlanModal'
import { ShareMemberAppModal } from '@/components/ShareMemberAppModal'

export default async function MemberDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // RBAC Check
  const currentUser = await getCurrentStaff(supabase)
  if (!currentUser || !(await hasRole(currentUser, 'manage_members'))) {
    redirect('/dashboard')
  }

  // Use the ID from the URL to fetch the member
  // If the link uses member.id instead of member.member_id, we fetch accordingly.
  // We'll try fetching by member_id, but if it doesn't match, we fallback to id.
  let member = await getMemberById(supabase, id)
  if (!member) {
    // fallback to querying by PK if the URL actually contained the primary key
    const { data } = await supabase
      .from('members')
      .select('member_id')
      .eq('id', id)
      .maybeSingle()
    if (data) {
      member = await getMemberById(supabase, data.member_id)
    }
  }

  if (!member) {
    notFound()
  }

  const plans = await getActivePlans(supabase)
  const planHistory = await getMemberPlanHistory(supabase, member.member_id)
  const appDate = await getAppDate()

  return (
    <div className="app-container">
      <header className="page-header items-center gap-4 border-b border-border pb-4">
        <Link href="/members" className="w-10 h-10 flex items-center justify-center rounded-full bg-surface hover:bg-surface-hover transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{member.name}</h1>
          <p className="text-muted-foreground text-xs">{member.username}</p>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <ShareMemberAppModal member={member as any} />
          <EditMemberModal member={member} />
          <DeactivateMemberButton memberId={member.member_id} />
        </div>
      </header>

      <main className="page-content mt-6 flex flex-col gap-6">
        <div className="glass p-6 rounded-xl flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Información del Miembro</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Nombre</p>
              <p className="font-medium">{member.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Teléfono</p>
              <p className="font-medium">{member.phone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ID de Usuario</p>
              <p className="font-medium">{member.username}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estado</p>
              <p className="font-medium capitalize">{member.status}</p>
            </div>
          </div>
        </div>

        {member.active_plan ? (
          <div className="glass p-6 rounded-xl flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Plan Activo</h2>
              <div className="flex gap-2">
                <EditPlanModal memberPlan={member.active_plan} memberId={member.member_id} />
                <AssignPlanModal memberId={member.member_id} plans={plans} currentRollover={member.active_plan.visits_remaining} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Plan</p>
                <p className="font-medium">{member.active_plan.plan?.description}</p>
              </div>
              <div className="row-span-2">
                <p className="text-sm text-muted-foreground mb-2">Estado de Visitas</p>
                <div className="flex flex-col gap-2 p-3 bg-black/10 rounded border border-white/5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Compradas (Total)</span>
                    <span className="font-medium">{member.active_plan.visits_purchased}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Usadas</span>
                    <span className="font-medium">{(member.active_plan as any).visits_used}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-t border-white/5 pt-1 mt-1">
                    <span className="text-muted-foreground">Disponibles / Restantes</span>
                    <span className="font-medium text-accent">{member.active_plan.visits_remaining}</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Fechas</p>
                <div className="text-sm flex flex-col gap-1">
                  <p><span className="text-muted-foreground w-16 inline-block">Inicio:</span> <span className="font-medium">{(member.active_plan as any).starts_at ? new Date((member.active_plan as any).starts_at).toLocaleDateString() : 'N/A'}</span></p>
                  <p><span className="text-muted-foreground w-16 inline-block">Expira:</span> <span className="font-medium">{new Date(member.active_plan.expiration_date).toLocaleDateString()}</span></p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:gap-6 gap-2 mt-2 pt-4 border-t border-white/5 text-[10px] text-muted-foreground">
              <div>
                <span className="uppercase tracking-wider block mb-0.5">Registro</span>
                <span className="text-white/80">{(member.active_plan as any).creator?.name || 'Sistema'}</span> • {new Date((member.active_plan as any).created_at).toLocaleString()}
              </div>
              {(member.active_plan as any).updated_at && (member.active_plan as any).updated_at !== (member.active_plan as any).created_at && (
                <div>
                  <span className="uppercase tracking-wider block mb-0.5">Última actualización</span>
                  <span className="text-white/80">{(member.active_plan as any).updater?.name || 'Sistema'}</span> • {new Date((member.active_plan as any).updated_at).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="glass p-8 rounded-xl flex flex-col items-center justify-center gap-4 text-center">
            <h2 className="text-xl font-bold text-muted-foreground">Sin Plan Activo</h2>
            <p className="text-sm text-muted-foreground max-w-sm mb-2">Este miembro no tiene un plan activo. Asigna uno nuevo para continuar.</p>
            <AssignPlanModal memberId={member.member_id} plans={plans} currentRollover={0} />
          </div>
        )}

        <div className="glass p-6 rounded-xl flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Historial de Planes</h2>
          {planHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay planes registrados.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {planHistory.map((mp: any) => (
                <div key={mp.id} className="p-4 rounded-lg bg-black/20 border border-white/5 flex flex-col gap-2 relative">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-sm">{mp.plan?.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Inicio: {mp.starts_at ? new Date(mp.starts_at).toLocaleDateString() : 'N/A'} • Expira: {mp.expiration_date ? new Date(mp.expiration_date).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        isPlanExpired(mp, appDate) ? 'bg-error/20 text-error border border-error/20' : 
                        isPlanActive(mp, appDate) ? 'bg-accent/20 text-accent border border-accent/20' : 
                        'bg-white/10 text-white/70'
                      }`}>
                        {isPlanExpired(mp, appDate) ? 'expired' : isPlanActive(mp, appDate) ? 'active' : mp.status}
                      </span>
                      {!isPlanExpired(mp, appDate) && (
                         <EditPlanModal memberPlan={mp} memberId={member.member_id} />
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-6 mt-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Compradas</p>
                      <p className="text-xs font-medium">{mp.visits_purchased} <span className="text-muted-foreground font-normal">visitas</span></p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Usadas</p>
                      <p className="text-xs font-medium">{mp.visits_used} <span className="text-muted-foreground font-normal">visitas</span></p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Disponibles / Restantes</p>
                      <p className="text-xs font-medium text-accent">{mp.visits_purchased - mp.visits_used} <span className="text-muted-foreground font-normal">visitas</span></p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:gap-6 gap-2 mt-2 pt-3 border-t border-white/5 text-[10px] text-muted-foreground">
                    <div>
                      <span className="uppercase tracking-wider block mb-0.5">Registro</span>
                      <span className="text-white/80">{mp.creator?.name || 'Sistema'}</span> • {new Date(mp.created_at).toLocaleString()}
                    </div>
                    {mp.updated_at && mp.updated_at !== mp.created_at && (
                      <div>
                        <span className="uppercase tracking-wider block mb-0.5">Última actualización</span>
                        <span className="text-white/80">{mp.updater?.name || 'Sistema'}</span> • {new Date(mp.updated_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass p-6 rounded-xl flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Registro y Auditoría</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Fecha de Registro</p>
              <p className="font-medium">{new Date(member.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Creado por</p>
              <p className="font-medium">{(member as any).creator?.name || 'Sistema'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Última Actualización</p>
              <p className="font-medium">{new Date(member.updated_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Actualizado por</p>
              <p className="font-medium">{(member as any).updater?.name || 'Sistema'}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
