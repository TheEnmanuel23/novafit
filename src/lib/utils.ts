
// src/lib/utils.ts
import { addDays, isAfter, format, isBefore, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlanType, MemberPlan, Member } from './types';
import { ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Global Time Travel utility for development testing
export function getCurrentDate(): Date {
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    const offsetStr = localStorage.getItem('dev_time_offset_days');
    if (offsetStr) {
      const offsetDays = parseInt(offsetStr, 10);
      if (!isNaN(offsetDays)) {
        return addDays(new Date(), offsetDays);
      }
    }
  }
  return new Date();
}

// Check membership status
// Calculate expiration date based on plan type
export function getExpirationDate(plan: MemberPlan): Date {
  let daysActive = plan.plan_days;
  
  // Fallback for older records or default
  if (!daysActive) {
    daysActive = 31;
    if (plan.plan_tipo === 'Quincenal') daysActive = 15;
    if (plan.plan_tipo === 'Semanal') daysActive = 6;
    if (plan.plan_tipo === 'Día') daysActive = 1;
  }

  // Adjust so that days are inclusive (e.g. 7 days starting today ends on the 6th day after today).
  // Use endOfDay so it expires at 23:59:59 of that final day.
  const targetDate = addDays(new Date(plan.fecha_inicio), Math.max(0, daysActive - 1));
  return endOfDay(targetDate);
}

// Check membership status
export function getMembershipStatus(plan: MemberPlan): 'Active' | 'Expired' {
  const expirationDate = getExpirationDate(plan);
  
  if (isAfter(getCurrentDate(), expirationDate)) {
    return 'Expired';
  }
  return 'Active';
}

// Format date for display
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return format(d, 'dd MMM yyyy', { locale: es });
}

// Export database dump logic (simplified)
export function generateSyncPayload(members: Member[], attendances: any[]) {
  return JSON.stringify({
    members,
    attendances,
    exportedAt: new Date().toISOString(),
  }, null, 2);
}
