import { getAppDate } from '@novafit/supabase/src/utils/date';
import type { SupabaseClient } from '@supabase/supabase-js'
import type { MemberPlan } from '@novafit/types'

export async function getActiveMemberPlan(
  supabase: SupabaseClient,
  memberId: string
): Promise<(MemberPlan & { visits_remaining: number; plan: any }) | null> {
  const { data, error } = await supabase
    .from('member_plans')
    .select('*, plan:plans(*)')
    .eq('member_id', memberId)
    .eq('status', 'active')
    .gt('expiration_date', getAppDate().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch active plan: ${error.message}`)
  if (!data) return null

  return {
    ...data,
    visits_remaining: (data as any).visits_purchased - (data as any).visits_used,
  } as any
}

export async function getMemberPlanHistory(
  supabase: SupabaseClient,
  memberId: string
): Promise<any[]> {
  const { data, error } = await supabase
    .from('member_plans')
    .select('*, plan:plans(*), creator:staff!member_plans_created_by_fkey(name), updater:staff!member_plans_updated_by_fkey(name)')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch plan history: ${error.message}`)
  return data ?? []
}

/**
 * Recharge logic:
 * 1. Check for active plan (status=active AND expiration_date > now)
 * 2. If active: rollover = remaining visits, capped at new plan's max_balance
 * 3. If expired/none: fresh start
 * 4. Mark old plan as expired (if exists)
 * 5. Create new member_plan
 * 6. Write transaction record
 */
export async function processRecharge(
  supabase: SupabaseClient,
  input: {
    memberId: string
    planId: string
    amountPaid: number
    registeredBy: string | null
    startsAt?: Date
    customVisits?: number
    customDays?: number
  }
): Promise<{ newPlan: MemberPlan; balanceBefore: number; balanceAfter: number }> {
  // Fetch new plan details
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('*')
    .eq('id', input.planId)
    .single()

  if (planError || !plan) throw new Error('Plan not found')

  // Get current active plan
  const { data: currentPlan } = await supabase
    .from('member_plans')
    .select('*')
    .eq('member_id', input.memberId)
    .eq('status', 'active')
    .gt('expiration_date', getAppDate().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const balanceBefore = currentPlan
    ? currentPlan.visits_purchased - currentPlan.visits_used
    : 0

  const rollover = currentPlan
    ? currentPlan.visits_purchased - currentPlan.visits_used
    : 0

  const visitsIncluded = input.customVisits ?? plan.visits_included
  const expirationDays = input.customDays ?? plan.expiration_days

  const rawNewBalance = rollover + visitsIncluded
  const newBalance = Math.min(rawNewBalance, plan.max_balance)
  const balanceAfter = newBalance

  const startsAt = input.startsAt || getAppDate()
  const newExpiration = new Date(startsAt)
  newExpiration.setDate(newExpiration.getDate() + Math.max(0, expirationDays - 1))
  newExpiration.setHours(23, 59, 59, 999)

  // Mark old plan as expired
  if (currentPlan) {
    await supabase
      .from('member_plans')
      .update({ status: 'expired', updated_at: getAppDate().toISOString() })
      .eq('id', currentPlan.id)
  }

  // Create new member_plan
  const { data: newMemberPlan, error: insertError } = await supabase
    .from('member_plans')
    .insert({
      member_id: input.memberId,
      plan_id: input.planId,
      visits_purchased: newBalance,
      visits_used: 0,
      starts_at: startsAt.toISOString(),
      expiration_date: newExpiration.toISOString(),
      status: 'active',
    })
    .select()
    .single()

  if (insertError) throw new Error(`Failed to create member plan: ${insertError.message}`)

  // Write transaction
  await supabase.from('transactions').insert({
    member_id: input.memberId,
    member_plan_id: newMemberPlan.id,
    plan_id: input.planId,
    visits_added: visitsIncluded,
    balance_before: balanceBefore,
    balance_after: balanceAfter,
    amount_paid: input.amountPaid,
    registered_by: input.registeredBy,
  })

  return { newPlan: newMemberPlan as MemberPlan, balanceBefore, balanceAfter }
}

/** Preview recharge without writing to DB */
export async function previewRecharge(
  supabase: SupabaseClient,
  memberId: string,
  planId: string
): Promise<{
  balanceBefore: number
  balanceAfter: number
  isRollover: boolean
  newExpiration: Date
  plan: any
}> {
  const { data: plan } = await supabase.from('plans').select('*').eq('id', planId).single()
  if (!plan) throw new Error('Plan not found')

  const { data: currentPlan } = await supabase
    .from('member_plans')
    .select('*')
    .eq('member_id', memberId)
    .eq('status', 'active')
    .gt('expiration_date', getAppDate().toISOString())
    .maybeSingle()

  const rollover = currentPlan ? currentPlan.visits_purchased - currentPlan.visits_used : 0
  const balanceBefore = rollover
  const rawNew = rollover + plan.visits_included
  const balanceAfter = Math.min(rawNew, plan.max_balance)

  const newExpiration = getAppDate()
  newExpiration.setDate(newExpiration.getDate() + Math.max(0, plan.expiration_days - 1))
  newExpiration.setHours(23, 59, 59, 999)

  return {
    balanceBefore,
    balanceAfter,
    isRollover: rollover > 0,
    newExpiration,
    plan,
  }
}
