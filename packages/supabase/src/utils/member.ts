import { getAppDate } from './date';
import type { MemberWithStatus, MemberPlanWithDetails, MemberPlanStatus } from '@novafit/types';

/**
 * Determines if a given plan is currently active based on its status and expiration date.
 */
export function isPlanActive(plan: Partial<MemberPlanWithDetails>): boolean {
  if (plan.status !== 'active') return false;
  if (!plan.expiration_date) return false;
  
  const remaining = (plan.visits_purchased || 0) - (plan.visits_used || 0);
  if (remaining <= 0) return false;
  
  return new Date(plan.expiration_date) > getAppDate();
}

/**
 * Determines if a given plan is expired based on its status, expiration date, or empty balance.
 */
export function isPlanExpired(plan: Partial<MemberPlanWithDetails>): boolean {
  if (plan.status === 'expired') return true;
  
  const remaining = (plan.visits_purchased || 0) - (plan.visits_used || 0);
  if (remaining <= 0) return true;
  
  if (!plan.expiration_date) return false;
  return new Date(plan.expiration_date) <= getAppDate();
}

/**
 * Computes the member's current status and active plan based on their plan history.
 */
export function computeMemberState(memberPlans?: Partial<MemberPlanWithDetails>[]): { status: MemberWithStatus['status'], active_plan: MemberPlanWithDetails | null } {
  if (!memberPlans || !Array.isArray(memberPlans)) {
    return { status: 'no_plan', active_plan: null };
  }
  
  const activePlan = memberPlans.find(isPlanActive);

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

  const hasExpired = memberPlans.some(isPlanExpired);

  return {
    status: hasExpired ? 'expired' : 'no_plan',
    active_plan: null
  };
}
