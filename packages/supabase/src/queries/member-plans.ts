import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import {
  getAppDate,
  parseDateOnly,
  parseDateEnd,
  calcExpirationDate,
  getTodayYYYYMMDD,
  getTodayPeriodStartISO,
  toPeriodYYYYMMDD,
  toTimezoneYYYYMMDD,
} from '@novafit/supabase/src/utils/date';
import { isPlanActive, isPlanScheduled } from '@novafit/supabase/src/utils/member';
import type { SupabaseClient } from '@supabase/supabase-js'
import type { MemberPlan } from '@novafit/types'

/**
 * Synchronizes a member's plans when:
 * 1. A scheduled plan's start date (`starts_at <= today`) has arrived while a previous plan was still marked 'active' in DB
 *    -> rolls over remaining valid visits (capped at max_balance) and marks the previous plan as 'expired'.
 * 2. A previous plan that was active when a scheduled plan was purchased has ended (exhausted visits on a prior day or expired)
 *    -> auto-activates the next scheduled plan starting today.
 */
export async function syncMemberPlans(
  supabase: SupabaseClient,
  memberPlans: any[] | undefined,
  appDate: Date
): Promise<any[]> {
  if (!memberPlans || !Array.isArray(memberPlans) || memberPlans.length <= 1) {
    return memberPlans ?? [];
  }

  const todayStr = getTodayYYYYMMDD(appDate);
  const nowISO = appDate.toISOString();

  // Sort plans chronologically by starts_at ascending, then created_at ascending
  const sorted = [...memberPlans].sort((a, b) => {
    const startA = toPeriodYYYYMMDD(a.starts_at) || '0000-00-00';
    const startB = toPeriodYYYYMMDD(b.starts_at) || '0000-00-00';
    if (startA !== startB) return startA.localeCompare(startB);
    return (a.created_at || '').localeCompare(b.created_at || '');
  });

  // 1. Reconcile plans whose starts_at <= today where an older plan still has status === 'active'
  const startedActiveStatusPlans = sorted.filter(
    (p) => p.status === 'active' && toPeriodYYYYMMDD(p.starts_at) <= todayStr
  );

  if (startedActiveStatusPlans.length > 1) {
    for (let i = 0; i < startedActiveStatusPlans.length - 1; i++) {
      const olderPlan = startedActiveStatusPlans[i];
      const newerPlan = startedActiveStatusPlans[i + 1];

      const olderExpStr = toPeriodYYYYMMDD(olderPlan.expiration_date);
      const newerStartStr = toPeriodYYYYMMDD(newerPlan.starts_at);
      const dayBeforeNewerStart = newerStartStr
        ? format(addDays(parseISO(newerStartStr), -1), 'yyyy-MM-dd')
        : '';

      // Roll over remaining visits if olderPlan was still valid up to when newerPlan started
      const olderRemaining = Math.max(0, (olderPlan.visits_purchased || 0) - (olderPlan.visits_used || 0));
      const canRollover = olderRemaining > 0 && olderExpStr >= dayBeforeNewerStart;

      olderPlan.status = 'expired';
      olderPlan.updated_at = nowISO;
      await supabase
        .from('member_plans')
        .update({ status: 'expired', updated_at: nowISO })
        .eq('id', olderPlan.id);

      if (canRollover) {
        let newPurchased = (newerPlan.visits_purchased || 0) + olderRemaining;
        const maxCap = newerPlan.plan?.max_balance;
        if (maxCap && newerPlan.plan?.key !== 'day') {
          newPurchased = Math.min(newPurchased, maxCap);
        }
        newerPlan.visits_purchased = newPurchased;
        newerPlan.updated_at = nowISO;
        await supabase
          .from('member_plans')
          .update({ visits_purchased: newPurchased, updated_at: nowISO })
          .eq('id', newerPlan.id);
      }
    }
  }

  // 2. Check if there is NO currently active plan, a scheduled plan exists, and a prior plan that was active
  //    when the scheduled plan was bought has now ended (exhausted visits on a prior day or expired after purchase).
  const hasCurrentlyActive = sorted.some((p) => isPlanActive(p, appDate));
  const scheduledPlans = sorted.filter((p) => isPlanScheduled(p, appDate));

  if (!hasCurrentlyActive && scheduledPlans.length > 0) {
    const nextScheduled = scheduledPlans[0];
    const scheduledCreatedDay = nextScheduled.created_at
      ? toTimezoneYYYYMMDD(nextScheduled.created_at)
      : todayStr;

    const priorPlanEndedAfterPurchase = sorted.find((p) => {
      if (p.id === nextScheduled.id || isPlanScheduled(p, appDate)) return false;
      const pCreatedDay = p.created_at ? toTimezoneYYYYMMDD(p.created_at) : '0000-00-00';
      if (pCreatedDay > scheduledCreatedDay) return false;

      const pExpStr = toPeriodYYYYMMDD(p.expiration_date);
      const remaining = (p.visits_purchased || 0) - (p.visits_used || 0);

      // Exhausted visits after the scheduled plan was bought (and prior to today so same-day re-entry still works)
      if (remaining <= 0 && p.updated_at && p.updated_at >= nextScheduled.created_at) {
        const exhaustedDay = toTimezoneYYYYMMDD(p.updated_at);
        if (exhaustedDay < todayStr) return true;
      }

      // Expired by date on or after the day the scheduled plan was bought, and before today
      if (pExpStr >= scheduledCreatedDay && pExpStr < todayStr) {
        return true;
      }

      return false;
    });

    if (priorPlanEndedAfterPurchase) {
      const origStart = toPeriodYYYYMMDD(nextScheduled.starts_at);
      const origEnd = toPeriodYYYYMMDD(nextScheduled.expiration_date);
      const durationDays =
        origStart && origEnd
          ? Math.max(1, differenceInCalendarDays(parseISO(origEnd), parseISO(origStart)))
          : nextScheduled.plan?.expiration_days || 30;

      const newStartsAt = parseDateOnly(todayStr);
      const newExpiration = calcExpirationDate(newStartsAt, durationDays);

      // Roll over remaining visits if priorPlan expired yesterday with unused visits
      const priorRemaining = Math.max(
        0,
        (priorPlanEndedAfterPurchase.visits_purchased || 0) - (priorPlanEndedAfterPurchase.visits_used || 0)
      );
      let newPurchased = nextScheduled.visits_purchased || 0;
      if (priorRemaining > 0) {
        newPurchased += priorRemaining;
        const maxCap = nextScheduled.plan?.max_balance;
        if (maxCap && nextScheduled.plan?.key !== 'day') {
          newPurchased = Math.min(newPurchased, maxCap);
        }
      }

      if (priorPlanEndedAfterPurchase.status === 'active') {
        priorPlanEndedAfterPurchase.status = 'expired';
        priorPlanEndedAfterPurchase.updated_at = nowISO;
        await supabase
          .from('member_plans')
          .update({ status: 'expired', updated_at: nowISO })
          .eq('id', priorPlanEndedAfterPurchase.id);
      }

      nextScheduled.starts_at = newStartsAt.toISOString();
      nextScheduled.expiration_date = newExpiration.toISOString();
      nextScheduled.visits_purchased = newPurchased;
      nextScheduled.updated_at = nowISO;

      await supabase
        .from('member_plans')
        .update({
          starts_at: nextScheduled.starts_at,
          expiration_date: nextScheduled.expiration_date,
          visits_purchased: newPurchased,
          updated_at: nowISO,
        })
        .eq('id', nextScheduled.id);
    }
  }

  return memberPlans;
}

/**
 * Manually (or on early check-in) activates a scheduled plan starting today,
 * rolling over any unused visits from the member's currently active plan (capped at max_balance).
 */
export async function activateScheduledPlan(
  supabase: SupabaseClient,
  input: {
    planId: string;
    memberId: string;
    staffId?: string | null;
  }
): Promise<MemberPlan> {
  const appDate = await getAppDate();
  const todayStr = getTodayYYYYMMDD(appDate);
  const nowISO = appDate.toISOString();

  const { data: targetPlan, error: targetError } = await supabase
    .from('member_plans')
    .select('*, plan:plans(*)')
    .eq('id', input.planId)
    .eq('member_id', input.memberId)
    .single();

  if (targetError || !targetPlan) {
    throw new Error('Plan programado no encontrado.');
  }

  // Find any other currently active plan for this member
  const { data: otherPlans } = await supabase
    .from('member_plans')
    .select('*, plan:plans(*)')
    .eq('member_id', input.memberId)
    .eq('status', 'active')
    .neq('id', input.planId);

  const activeNow = (otherPlans ?? []).filter((p) => isPlanActive(p as any, appDate));
  const rollover = activeNow.reduce(
    (sum, p) => sum + Math.max(0, (p.visits_purchased || 0) - (p.visits_used || 0)),
    0
  );

  // Compute original duration of the scheduled plan
  const origStart = toPeriodYYYYMMDD(targetPlan.starts_at);
  const origEnd = toPeriodYYYYMMDD(targetPlan.expiration_date);
  const durationDays =
    origStart && origEnd
      ? Math.max(1, differenceInCalendarDays(parseISO(origEnd), parseISO(origStart)))
      : (targetPlan as any).plan?.expiration_days || 30;

  const newStartsAt = parseDateOnly(todayStr);
  const newExpiration = calcExpirationDate(newStartsAt, durationDays);

  let newVisitsPurchased = targetPlan.visits_purchased + rollover;
  const maxCap = (targetPlan as any).plan?.max_balance;
  if (maxCap && (targetPlan as any).plan?.key !== 'day') {
    newVisitsPurchased = Math.min(newVisitsPurchased, maxCap);
  }

  // Expire any previous active plans
  if (activeNow.length > 0) {
    const idsToExpire = activeNow.map((p) => p.id);
    await supabase
      .from('member_plans')
      .update({ status: 'expired', updated_at: nowISO })
      .in('id', idsToExpire);
  }

  const { data: updatedPlan, error: updateError } = await supabase
    .from('member_plans')
    .update({
      starts_at: newStartsAt.toISOString(),
      expiration_date: newExpiration.toISOString(),
      visits_purchased: newVisitsPurchased,
      status: 'active',
      updated_at: nowISO,
    })
    .eq('id', input.planId)
    .select('*, plan:plans(*)')
    .single();

  if (updateError || !updatedPlan) {
    throw new Error(`No se pudo activar el plan: ${updateError?.message || 'Error desconocido'}`);
  }

  return updatedPlan as MemberPlan;
}

export async function getActiveMemberPlan(
  supabase: SupabaseClient,
  memberId: string
): Promise<(MemberPlan & { visits_remaining: number; plan: any }) | null> {
  const appDate = await getAppDate();
  const todayStr = getTodayYYYYMMDD(appDate);
  const { data, error } = await supabase
    .from('member_plans')
    .select('*, plan:plans(*)')
    .eq('member_id', memberId)
    .eq('status', 'active')
    .lte('starts_at', parseDateEnd(todayStr).toISOString())
    .gte('expiration_date', getTodayPeriodStartISO(appDate))
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
 * - If startsAt > today (Scheduled / Future plan):
 *   1. Clean up any already-expired plans in DB
 *   2. Keep current active plan untouched
 *   3. Create new member_plan starting on startsAt (rollover will happen automatically when startsAt arrives or when activated)
 *   4. Write transaction record for today's payment
 * - If startsAt <= today (Immediate activation):
 *   1. Check for active plan (status=active, starts_at <= today, expiration_date >= today)
 *   2. If active: rollover = remaining visits, capped at new plan's max_balance
 *   3. If expired/none: fresh start
 *   4. Mark old active plan as expired (if exists)
 *   5. Create new member_plan
 *   6. Write transaction record
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
    customVisitsUsed?: number
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

  const appDate = await getAppDate();
  const todayStr = getTodayYYYYMMDD(appDate);
  const startsAt = input.startsAt || parseDateOnly(todayStr);
  const startsAtStr = toPeriodYYYYMMDD(startsAt);
  const isFutureStart = startsAtStr > todayStr;

  const visitsIncluded = input.customVisits ?? plan.visits_included
  const expirationDays = input.customDays ?? plan.expiration_days
  let newVisitsUsed = input.customVisitsUsed || 0;

  // Clean up any stale past plans whose expiration_date already passed
  await supabase
    .from('member_plans')
    .update({ status: 'expired', updated_at: appDate.toISOString() })
    .eq('member_id', input.memberId)
    .eq('status', 'active')
    .lt('expiration_date', getTodayPeriodStartISO(appDate));

  if (isFutureStart) {
    // Scheduled future plan: do NOT expire the currently active plan and do NOT roll over now
    const newBalance = visitsIncluded;
    const newExpiration = calcExpirationDate(startsAt, expirationDays);
    const balanceAfter = newBalance - newVisitsUsed;

    const { data: newMemberPlan, error: insertError } = await supabase
      .from('member_plans')
      .insert({
        member_id: input.memberId,
        plan_id: input.planId,
        visits_purchased: newBalance,
        visits_used: newVisitsUsed,
        starts_at: startsAt.toISOString(),
        expiration_date: newExpiration.toISOString(),
        status: 'active',
      })
      .select()
      .single()

    if (insertError) throw new Error(`Failed to create scheduled member plan: ${insertError.message}`)

    await supabase.from('transactions').insert({
      member_id: input.memberId,
      member_plan_id: newMemberPlan.id,
      plan_id: input.planId,
      visits_added: visitsIncluded,
      balance_before: 0,
      balance_after: balanceAfter,
      amount_paid: input.amountPaid,
      registered_by: input.registeredBy,
    })

    return { newPlan: newMemberPlan as MemberPlan, balanceBefore: 0, balanceAfter }
  }

  // Immediate plan (startsAt <= today): get current active plan (excluding any future scheduled plans)
  const { data: currentPlan } = await supabase
    .from('member_plans')
    .select('*, plan:plans(*)')
    .eq('member_id', input.memberId)
    .eq('status', 'active')
    .lte('starts_at', parseDateEnd(todayStr).toISOString())
    .gte('expiration_date', getTodayPeriodStartISO(appDate))
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const balanceBefore = currentPlan
    ? Math.max(0, currentPlan.visits_purchased - currentPlan.visits_used)
    : 0

  const rollover = balanceBefore

  const isNewDía = plan.key === 'day';
  const isCurrentDay = currentPlan && currentPlan.plan ? (currentPlan.plan.key === 'day') : false;

  let newBalance = 0;
  let newExpiration = startsAt;
  let finalPlanId = input.planId;
  let maxBalanceCap = plan.max_balance;

  if (!currentPlan) {
    // Scenario A: Fresh start
    newBalance = visitsIncluded;
    newExpiration = calcExpirationDate(startsAt, expirationDays);
  } else {
    // We have a current active plan
    if (isNewDía) {
      let activeCap = isCurrentDay ? null : currentPlan.plan.max_balance;
      let newRemaining = rollover + visitsIncluded;
      if (activeCap) {
        newRemaining = Math.min(newRemaining, activeCap);
      }
      newVisitsUsed = input.customVisitsUsed !== undefined ? input.customVisitsUsed : currentPlan.visits_used;
      newBalance = newRemaining + newVisitsUsed;
      
      if (isCurrentDay) {
        newExpiration = calcExpirationDate(startsAt, expirationDays);
      } else {
        finalPlanId = currentPlan.plan_id;
        newExpiration = parseISO(currentPlan.expiration_date);
      }
    } else {
      newBalance = rollover + visitsIncluded;
      if (maxBalanceCap) {
        newBalance = Math.min(newBalance, maxBalanceCap);
      }
      newExpiration = calcExpirationDate(startsAt, expirationDays);
    }
  }

  const balanceAfter = newBalance - newVisitsUsed;

  // Mark old plan as expired
  if (currentPlan) {
    await supabase
      .from('member_plans')
      .update({ status: 'expired', updated_at: appDate.toISOString() })
      .eq('id', currentPlan.id)
  }

  // Create new member_plan
  const { data: newMemberPlan, error: insertError } = await supabase
    .from('member_plans')
    .insert({
      member_id: input.memberId,
      plan_id: finalPlanId,
      visits_purchased: newBalance,
      visits_used: newVisitsUsed,
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

  const appDate = await getAppDate();

  const todayStr = getTodayYYYYMMDD(appDate);
  const { data: currentPlan } = await supabase
    .from('member_plans')
    .select('*, plan:plans(*)')
    .eq('member_id', memberId)
    .eq('status', 'active')
    .lte('starts_at', parseDateEnd(todayStr).toISOString())
    .gte('expiration_date', getTodayPeriodStartISO(appDate))
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const rollover = currentPlan ? currentPlan.visits_purchased - currentPlan.visits_used : 0
  const balanceBefore = rollover
  
  const isNewDay = plan.key === 'day';
  const isCurrentDay = currentPlan && currentPlan.plan ? (currentPlan.plan.key === 'day') : false;

  let newBalance = 0;
  const startsAt = parseDateOnly(getTodayYYYYMMDD(appDate));
  let newExpiration = startsAt;
  let maxBalanceCap = plan.max_balance;

  if (!currentPlan) {
    newBalance = plan.visits_included;
    newExpiration = calcExpirationDate(startsAt, plan.expiration_days);
  } else {
    if (isNewDay) {
      let activeCap = isCurrentDay ? null : currentPlan.plan.max_balance;
      let newRemaining = rollover + plan.visits_included;
      if (activeCap) newRemaining = Math.min(newRemaining, activeCap);
      newBalance = newRemaining; // In preview, balanceAfter is just newBalance
      
      if (isCurrentDay) {
        newExpiration = calcExpirationDate(startsAt, plan.expiration_days);
      } else {
        newExpiration = parseISO(currentPlan.expiration_date);
      }
    } else {
      newBalance = rollover + plan.visits_included;
      if (maxBalanceCap) newBalance = Math.min(newBalance, maxBalanceCap);
      newExpiration = calcExpirationDate(startsAt, plan.expiration_days);
    }
  }

  const balanceAfter = newBalance;

  return {
    balanceBefore,
    balanceAfter,
    isRollover: rollover > 0,
    newExpiration,
    plan,
  }
}
