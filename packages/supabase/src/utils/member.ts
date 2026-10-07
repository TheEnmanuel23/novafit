import type { MemberWithStatus, MemberPlanWithDetails, MemberPlanStatus } from '@novafit/types';
import { toTimezoneYYYYMMDD } from './date';

/**
 * Determines if a given plan is currently active based on its status and expiration date.
 * If a plan ran out of visits TODAY, it is still considered active for the rest of the day to allow re-entries.
 */
export function isPlanActive(plan: Partial<MemberPlanWithDetails>, appDate: Date): boolean {
  if (!plan.expiration_date) return false;
  
  const appDateStr = toTimezoneYYYYMMDD(appDate);
  const isUpdatedToday = plan.updated_at && 
    toTimezoneYYYYMMDD(plan.updated_at) === appDateStr;
  
  const remaining = (plan.visits_purchased || 0) - (plan.visits_used || 0);

  // For expiration_date (which is UTC midnight), we compare strings lexicographically (YYYY-MM-DD)
  const expDateStr = toTimezoneYYYYMMDD(plan.expiration_date, 'UTC');


  if (plan.status !== 'active') {
    // If it was marked expired TODAY because it ran out of visits, it stays active for re-entries today
    if (plan.status === 'expired' && isUpdatedToday && remaining <= 0) {
      // Continue checks
    } else {
      return false;
    }
  }
  
  if (remaining <= 0 && !isUpdatedToday) {
    return false;
  }
  
  return expDateStr >= appDateStr;
}

/**
 * Determines if a given plan is expired based on its status, expiration date, or empty balance.
 */
export function isPlanExpired(plan: Partial<MemberPlanWithDetails>, appDate: Date): boolean {
  if (!plan.expiration_date) return false;

  const appDateStr = toTimezoneYYYYMMDD(appDate);
  const isUpdatedToday = plan.updated_at && 
    toTimezoneYYYYMMDD(plan.updated_at) === appDateStr;
  
  const remaining = (plan.visits_purchased || 0) - (plan.visits_used || 0);
  
  const expDateStr = toTimezoneYYYYMMDD(plan.expiration_date, 'UTC');

  if (plan.status === 'expired') {
    if (isUpdatedToday && remaining <= 0) return false; // Still active for today's re-entries
    return true;
  }
  
  if (remaining <= 0) {
    if (isUpdatedToday) return false; // Still active for today's re-entries
    return true;
  }
  
  return expDateStr < appDateStr;
}

/**
 * Computes the member's current status and active plan based on their plan history.
 */
export function computeMemberState(memberPlans: Partial<MemberPlanWithDetails>[] | undefined, appDate: Date): { status: MemberWithStatus['status'], active_plan: MemberPlanWithDetails | null } {
  if (!memberPlans || !Array.isArray(memberPlans)) {
    return { status: 'no_plan', active_plan: null };
  }
  
  const activePlan = memberPlans.find((p) => isPlanActive(p, appDate));

  if (activePlan) {
    const remaining = (activePlan.visits_purchased || 0) - (activePlan.visits_used || 0);
    // If it's a day plan that was exhausted today, remaining will be <= 0.
    // We can show 'active' if remaining <= 0 (meaning it's the exhaustion day), or 'low_balance'.
    // We'll return 'active' if remaining <= 0 so it doesn't look bad to the user, or 'low_balance' if remaining > 0 and <= 3.
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
      } as MemberPlanWithDetails
    };
  }

  const hasExpired = memberPlans.some((p) => isPlanExpired(p, appDate));

  return {
    status: hasExpired ? 'expired' : 'no_plan',
    active_plan: null
  };
}
