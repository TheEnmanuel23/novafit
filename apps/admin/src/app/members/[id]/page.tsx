import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentStaff, hasRole } from '@novafit/supabase'
import { getMemberById } from '@novafit/supabase/src/queries/members'
import { getActivePlans } from '@novafit/supabase/src/queries/plans'
import { getMemberPlanHistory } from '@novafit/supabase/src/queries/member-plans'
import { getMemberAttendances } from '@novafit/supabase/src/queries/checkin'
import { EditMemberModal } from '@/components/EditMemberModal'
import { DeactivateMemberButton } from '@/components/DeactivateMemberButton'
import { AssignPlanModal } from '@/components/AssignPlanModal'
import { ActivatePlanButton } from '@/components/ActivatePlanButton'
import { isPlanExpired } from '@novafit/supabase/src/utils/member'
import { getAppDate } from '@novafit/supabase/src/utils/date'
import { EditPlanModal } from '@/components/EditPlanModal'
import { ShareMemberAppModal } from '@/components/ShareMemberAppModal'
import { AuthorizePasswordResetButton } from '@/components/AuthorizePasswordResetButton'
import { MemberProfileCards } from '@novafit/ui'

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
  const attendances = await getMemberAttendances(supabase, member.member_id)
  const appDate = await getAppDate()
  const scheduledPlans = member.scheduled_plans ?? []
  const latestPlanExpiration =
    scheduledPlans.length > 0
      ? scheduledPlans[scheduledPlans.length - 1]?.expiration_date
      : member.active_plan?.expiration_date

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
          <AuthorizePasswordResetButton
            memberId={member.member_id}
            isAllowed={Boolean((member as any).password_reset_allowed)}
          />
          <ShareMemberAppModal member={member as any} />
          <EditMemberModal member={member} />
          <DeactivateMemberButton memberId={member.member_id} />
        </div>
      </header>

      <main className="page-content mt-6 flex flex-col gap-6">
        <MemberProfileCards
          member={member as any}
          planHistory={planHistory}
          attendances={attendances}
          appDate={appDate}
          activePlanHeaderActions={
            member.active_plan ? (
              <>
                <EditPlanModal memberPlan={member.active_plan} memberId={member.member_id} />
                <AssignPlanModal
                  memberId={member.member_id}
                  plans={plans}
                  currentRollover={member.active_plan.visits_remaining}
                  currentPlanExpiration={latestPlanExpiration}
                />
              </>
            ) : undefined
          }
          emptyPlanDescription={
            scheduledPlans.length > 0
              ? 'Este miembro tiene un plan programado para iniciar próximamente. Puedes activarlo ahora o asignar otro plan.'
              : 'Este miembro no tiene un plan activo. Asigna uno nuevo para continuar.'
          }
          emptyPlanActions={
            <AssignPlanModal
              memberId={member.member_id}
              plans={plans}
              currentRollover={0}
              currentPlanExpiration={latestPlanExpiration}
            />
          }
          renderScheduledPlanActions={(sp: any) => (
            <>
              <ActivatePlanButton
                planId={sp.id}
                memberId={member.member_id}
                hasActivePlan={Boolean(member.active_plan)}
              />
              <EditPlanModal memberPlan={sp} memberId={member.member_id} />
            </>
          )}
          renderHistoryPlanActions={(mp: any) =>
            !isPlanExpired(mp, appDate) ? (
              <EditPlanModal memberPlan={mp} memberId={member.member_id} />
            ) : null
          }
        />
      </main>
    </div>
  )
}
