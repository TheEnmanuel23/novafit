import { getAppDate } from '@novafit/supabase/src/utils/date';
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CheckInResult, MemberWithStatus } from '@novafit/types'

/**
 * Process a check-in by member_id (from QR code scan) or username (typed).
 * Uses service role client — no auth required.
 * Returns a CheckInResult with full details for the UI feedback screen.
 */
export async function processCheckIn(
  supabase: SupabaseClient,
  lookup: { type: 'member_id' | 'username'; value: string }
): Promise<CheckInResult> {
  // 1. Fetch member with active plan
  const memberQuery = supabase
    .from('members')
    .select(
      `
      *,
      member_plans (
        id, plan_id, visits_purchased, visits_used, expiration_date, status,
        plan:plans (*)
      )
    `
    )
    .eq('deleted', false)

  const { data: memberData, error: memberError } =
    lookup.type === 'member_id'
      ? await memberQuery.eq('member_id', lookup.value).maybeSingle()
      : await memberQuery.eq('username', lookup.value.toUpperCase()).maybeSingle()

  if (memberError) {
    return { type: 'no_plan', message: 'Error al buscar el miembro.' }
  }

  if (!memberData) {
    return { type: 'no_plan', message: 'Miembro no encontrado.' }
  }

  const member = memberData as any

  // 2. Find active plan
  const activePlan = (member.member_plans as any[]).find(
    (mp: any) =>
      mp.status === 'active' && 
      new Date(mp.expiration_date) > getAppDate() &&
      (!mp.starts_at || new Date(mp.starts_at) <= getAppDate())
  )

  if (!activePlan) {
    // Check if there's an expired plan
    const hasExpired = (member.member_plans as any[]).some(
      (mp: any) => mp.status === 'expired'
    )
    return {
      type: hasExpired ? 'expired' : 'no_plan',
      member,
      message: hasExpired
        ? 'El plan de este miembro ha expirado.'
        : 'Este miembro no tiene un plan activo.',
    }
  }

  const balanceBefore = activePlan.visits_purchased - activePlan.visits_used

  // 3. Check remaining visits
  if (balanceBefore <= 0) {
    return {
      type: 'no_visits',
      member,
      balance_before: 0,
      balance_after: 0,
      expiration_date: activePlan.expiration_date,
      message: 'No quedan visitas en este plan.',
    }
  }

  // 4. Decrement visits_used
  const { error: updateError } = await supabase
    .from('member_plans')
    .update({
      visits_used: activePlan.visits_used + 1,
      updated_at: getAppDate().toISOString(),
    })
    .eq('id', activePlan.id)

  if (updateError) {
    return { type: 'no_plan', message: 'Error al registrar la visita.' }
  }

  const balanceAfter = balanceBefore - 1

  // 5. Write attendance record
  await supabase.from('attendances').insert({
    member_id: member.member_id,
    member_plan_id: activePlan.id,
    balance_before: balanceBefore,
    balance_after: balanceAfter,
    registered_by: null, // kiosk mode — no staff auth
  })

  return {
    type: 'success',
    member,
    balance_before: balanceBefore,
    balance_after: balanceAfter,
    expiration_date: activePlan.expiration_date,
    message: `¡Bienvenido, ${member.name}!`,
  }
}
