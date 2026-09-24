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
import { EditPlanModal } from '@/components/EditPlanModal'

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
                <AssignPlanModal memberId={member.member_id} plans={plans} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Plan</p>
                <p className="font-medium">{member.active_plan.plan?.description}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Visitas Restantes</p>
                <p className="font-medium text-accent">{member.active_plan.visits_remaining} / {member.active_plan.visits_purchased}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha de Inicio</p>
                <p className="font-medium">{(member.active_plan as any).starts_at ? new Date((member.active_plan as any).starts_at).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha de Expiración</p>
                <p className="font-medium">{new Date(member.active_plan.expiration_date).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass p-8 rounded-xl flex flex-col items-center justify-center gap-4 text-center">
            <h2 className="text-xl font-bold text-muted-foreground">Sin Plan Activo</h2>
            <p className="text-sm text-muted-foreground max-w-sm mb-2">Este miembro no tiene un plan activo. Asigna uno nuevo para continuar.</p>
            <AssignPlanModal memberId={member.member_id} plans={plans} />
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
                        {mp.starts_at ? new Date(mp.starts_at).toLocaleDateString() : 'N/A'} - {mp.expiration_date ? new Date(mp.expiration_date).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        mp.status === 'active' ? 'bg-accent/20 text-accent border border-accent/20' : 
                        mp.status === 'expired' ? 'bg-error/20 text-error border border-error/20' : 
                        'bg-white/10 text-white/70'
                      }`}>
                        {mp.status}
                      </span>
                      {mp.status !== 'expired' && (
                         <EditPlanModal memberPlan={mp} memberId={member.member_id} />
                      )}
                    </div>
                  </div>
                  <div className="flex gap-4 mt-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Visitas</p>
                      <p className="text-xs font-medium">{mp.visits_used} / {mp.visits_purchased}</p>
                    </div>
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
