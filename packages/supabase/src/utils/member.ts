import type { MemberWithStatus, MemberPlanWithDetails } from '@novafit/types';
import { getTodayYYYYMMDD, toPeriodYYYYMMDD } from './date';

/**
 * Determines if a given plan is scheduled to start in the future (starts_at > today).
 */
export function isPlanScheduled(plan: Partial<MemberPlanWithDetails>, appDate: Date): boolean {
  if (plan.status !== 'active') return false;
  if (!plan.starts_at) return false;

  const remaining = (plan.visits_purchased || 0) - (plan.visits_used || 0);
  if (remaining <= 0) return false;

  const appDateStr = getTodayYYYYMMDD(appDate);
  const startDateStr = toPeriodYYYYMMDD(plan.starts_at);

  return startDateStr > appDateStr;
}

/**
 * Determines if a given plan is currently active based on its status, start date, and expiration date.
 * If a plan ran out of visits TODAY, it is still considered active for the rest of the day to allow re-entries.
 */
export function isPlanActive(plan: Partial<MemberPlanWithDetails>, appDate: Date): boolean {
  if (!plan.expiration_date) return false;
  
  const appDateStr = getTodayYYYYMMDD(appDate);
  const remaining = (plan.visits_purchased || 0) - (plan.visits_used || 0);

  const expDateStr = toPeriodYYYYMMDD(plan.expiration_date);

  if (plan.status !== 'active') {
    return false;
  }

  if (plan.starts_at && toPeriodYYYYMMDD(plan.starts_at) > appDateStr) {
    return false;
  }
  
  if (remaining <= 0) {
    return false;
  }
  
  return expDateStr >= appDateStr;
}

/**
 * Determines if a given plan is expired based on its status, expiration date, or empty balance.
 */
export function isPlanExpired(plan: Partial<MemberPlanWithDetails>, appDate: Date): boolean {
  if (!plan.expiration_date) return false;

  if (plan.status === 'expired') {
    return true;
  }

  if (isPlanScheduled(plan, appDate)) {
    return false;
  }

  const appDateStr = getTodayYYYYMMDD(appDate);
  const remaining = (plan.visits_purchased || 0) - (plan.visits_used || 0);
  const expDateStr = toPeriodYYYYMMDD(plan.expiration_date);
  
  if (remaining <= 0) {
    return true;
  }
  
  return expDateStr < appDateStr;
}

/**
 * Computes the member's current status, active plan, and any scheduled future plans based on their plan history.
 */
export function computeMemberState(
  memberPlans: Partial<MemberPlanWithDetails>[] | undefined,
  appDate: Date
): {
  status: MemberWithStatus['status'];
  active_plan: MemberPlanWithDetails | null;
  scheduled_plans: MemberPlanWithDetails[];
} {
  if (!memberPlans || !Array.isArray(memberPlans)) {
    return { status: 'no_plan', active_plan: null, scheduled_plans: [] };
  }

  const scheduledPlans = memberPlans
    .filter((p) => isPlanScheduled(p, appDate))
    .sort((a, b) => {
      const startA = toPeriodYYYYMMDD(a.starts_at) || '9999-99-99';
      const startB = toPeriodYYYYMMDD(b.starts_at) || '9999-99-99';
      if (startA !== startB) return startA.localeCompare(startB);
      return (a.created_at || '').localeCompare(b.created_at || '');
    })
    .map(
      (p) =>
        ({
          ...p,
          visits_remaining: (p.visits_purchased || 0) - (p.visits_used || 0),
        }) as MemberPlanWithDetails
    );

  const activeCandidates = memberPlans
    .filter((p) => isPlanActive(p, appDate))
    .sort((a, b) => {
      const startA = toPeriodYYYYMMDD(a.starts_at) || '0000-00-00';
      const startB = toPeriodYYYYMMDD(b.starts_at) || '0000-00-00';
      if (startA !== startB) return startB.localeCompare(startA);
      return (b.created_at || '').localeCompare(a.created_at || '');
    });

  const activePlan = activeCandidates[0];

  if (activePlan) {
    const remaining = (activePlan.visits_purchased || 0) - (activePlan.visits_used || 0);
    let status: MemberWithStatus['status'] = 'active';
    if (remaining <= 0) {
      status = 'active'; // Still fully active for the day
    } else if (remaining <= 3) {
      status = 'low_balance';
    }

    return {
      status,
      active_plan: {
        ...activePlan,
        visits_remaining: remaining,
      } as MemberPlanWithDetails,
      scheduled_plans: scheduledPlans,
    };
  }

  if (scheduledPlans.length > 0) {
    return {
      status: 'scheduled',
      active_plan: null,
      scheduled_plans: scheduledPlans,
    };
  }

  const hasExpired = memberPlans.some((p) => isPlanExpired(p, appDate));

  return {
    status: hasExpired ? 'expired' : 'no_plan',
    active_plan: null,
    scheduled_plans: [],
  };
}
