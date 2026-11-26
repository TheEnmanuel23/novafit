import type { Metadata } from 'next'
import { PageBackLink } from '@/components/PageBackLink'
import { ProfileSection } from '@/components/ProfileSection'
import { requireCurrentMember } from '@/lib/member-session'

export const metadata: Metadata = {
  title: 'Información del Miembro | NovaFit',
}

export default async function MemberProfilePage() {
  const member = await requireCurrentMember()

  return (
    <>
      <h1 className="sr-only">Información del Miembro</h1>
      <PageBackLink />
      <ProfileSection member={member} />
    </>
  )
}

