import { cache } from 'react'
import { redirect } from 'next/navigation'
import { getAppDate } from '@novafit/supabase/src/utils/date'
import { getMemberByUsername } from '@novafit/supabase/src/queries/members'
import { getMemberPlanHistory } from '@novafit/supabase/src/queries/member-plans'
import { getMemberAttendances } from '@novafit/supabase/src/queries/checkin'
import type { MemberWithStatus } from '@novafit/types'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const MEMBER_EMAIL_SUFFIX = '@member.novafit.local'

/**
 * Resolves and memoizes the authenticated member once per RSC request.
 * Calling `createClient()` before the try/catch preserves Next.js dynamic rendering bailout.
 */
export const getCurrentMember = cache(async (): Promise<MemberWithStatus | null> => {
  const supabase = await createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.email?.endsWith(MEMBER_EMAIL_SUFFIX)) {
      return null
    }

    const username = user.email.slice(0, -MEMBER_EMAIL_SUFFIX.length).toUpperCase()
    const adminClient = createServiceClient()
    return await getMemberByUsername(adminClient, username)
  } catch (err) {
    console.error('[member-session] Failed to resolve current member:', err)
    return null
  }
})

export async function requireCurrentMember(): Promise<MemberWithStatus> {
  const member = await getCurrentMember()
  if (!member) {
    redirect('/')
  }
  return member
}

export async function getMemberPlansPageData(memberId: string) {
  const adminClient = createServiceClient()
  const [planHistory, appDate] = await Promise.all([
    getMemberPlanHistory(adminClient, memberId),
    getAppDate(),
  ])
  return { planHistory, appDate }
}

export async function getMemberAttendancesPageData(memberId: string) {
  const adminClient = createServiceClient()
  return getMemberAttendances(adminClient, memberId)
}

