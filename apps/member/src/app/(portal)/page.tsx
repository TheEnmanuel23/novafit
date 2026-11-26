import type { Metadata } from 'next'
import { MemberActivePlanCard, MemberScheduledPlansCard } from '@novafit/ui'
import { MemberAuthScreen } from '@/components/MemberAuthScreen'
import { RecoveryInfoBanner } from '@/components/RecoveryInfoBanner'
import { getCurrentMember } from '@/lib/member-session'

export const metadata: Metadata = {
  title: 'Plan Activo | NovaFit',
}

interface HomePageProps {
  searchParams: Promise<{ id?: string; username?: string }>
}

export default async function MemberHomePage({ searchParams }: HomePageProps) {
  const member = await getCurrentMember()

  if (!member) {
    const params = await searchParams
    const initialUsername = params.id || params.username || ''
    return <MemberAuthScreen initialUsername={initialUsername} />
  }

  const scheduledPlans = member.scheduled_plans ?? []

  return (
    <>
      <h1 className="sr-only">Mi Plan Activo</h1>

      <RecoveryInfoBanner member={member} />

      <MemberActivePlanCard
        member={member}
        showAuditInfo={false}
        emptyStateDescription={
          scheduledPlans.length > 0
            ? 'Tienes un plan programado para iniciar próximamente.'
            : 'No tienes un plan activo en este momento. Consulta en recepción para asignar o renovar tu plan.'
        }
      />

      {scheduledPlans.length > 0 && <MemberScheduledPlansCard scheduledPlans={scheduledPlans} />}
    </>
  )
}

