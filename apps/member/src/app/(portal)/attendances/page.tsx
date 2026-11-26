import type { Metadata } from 'next'
import { MemberAttendanceHistoryCard } from '@novafit/ui'
import { PageBackLink } from '@/components/PageBackLink'
import { getMemberAttendancesPageData, requireCurrentMember } from '@/lib/member-session'

export const metadata: Metadata = {
  title: 'Historial de Visitas | NovaFit',
}

export default async function MemberAttendancesPage() {
  const member = await requireCurrentMember()
  const attendances = await getMemberAttendancesPageData(member.member_id)

  return (
    <>
      <h1 className="sr-only">Historial de Visitas</h1>
      <PageBackLink />
      <MemberAttendanceHistoryCard attendances={attendances} />
    </>
  )
}

