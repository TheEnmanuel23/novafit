import type { Metadata } from 'next'
import { MemberPlanHistoryCard, MemberScheduledPlansCard } from '@novafit/ui'
import { PageBackLink } from '@/components/PageBackLink'
import { getMemberPlansPageData, requireCurrentMember } from '@/lib/member-session'

export const metadata: Metadata = {
  title: 'Historial de Planes | NovaFit',
}

export default async function MemberPlansPage() {
  const member = await requireCurrentMember()
  const { planHistory, appDate } = await getMemberPlansPageData(member.member_id)
  const scheduledPlans = member.scheduled_plans ?? []

  return (
    <>
      <h1 className="sr-only">Historial de Planes</h1>
      <PageBackLink />
      {scheduledPlans.length > 0 && <MemberScheduledPlansCard scheduledPlans={scheduledPlans} />}
      <MemberPlanHistoryCard planHistory={planHistory} appDate={appDate} showAuditInfo={false} />
    </>
  )
}

