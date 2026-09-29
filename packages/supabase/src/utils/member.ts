import type { MemberWithStatus, MemberPlanWithDetails, MemberPlanStatus } from '@novafit/types';
import { isAfter, isBefore, isEqual } from 'date-fns';

/**
 * Determines if a given plan is currently active based on its status and expiration date.
 */
export function isPlanActive(plan: Partial<MemberPlanWithDetails>, appDate: Date): boolean {
  if (plan.status !== 'active') return false;
  if (!plan.expiration_date) return false;
  
  const remaining = (plan.visits_purchased || 0) - (plan.visits_used || 0);
  if (remaining <= 0) return false;
  
  return isAfter(new Date(plan.expiration_date), appDate);
}

/**
 * Determines if a given plan is expired based on its status, expiration date, or empty balance.
 */
export function isPlanExpired(plan: Partial<MemberPlanWithDetails>, appDate: Date): boolean {
  if (plan.status === 'expired') return true;
  
  const remaining = (plan.visits_purchased || 0) - (plan.visits_used || 0);
  if (remaining <= 0) return true;
  
  if (!plan.expiration_date) return false;
  const expDate = new Date(plan.expiration_date);
  return isBefore(expDate, appDate) || isEqual(expDate, appDate);
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
    return {
      status: remaining <= 3 ? 'low_balance' : 'active',
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
