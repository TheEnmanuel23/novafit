
// src/lib/utils.ts
import { addDays, isAfter, format, isBefore, endOfDay, getDay } from 'date-fns';
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

  // Force 6 days for Semanal to fix the 7 days bug
  if (plan.plan_tipo === 'Semanal') {
    daysActive = 6;
  }
  
  // Fallback for older records or default
  if (!daysActive) {
    daysActive = 31;
    if (plan.plan_tipo === 'Quincenal') daysActive = 15;
    if (plan.plan_tipo === 'Semanal') daysActive = 6;
    if (plan.plan_tipo === 'Día') daysActive = 1;
  }

  // We skip Sundays only for short plans (weekly or daily)
  const isShortPlan = daysActive <= 7 || plan.plan_tipo === 'Semanal' || plan.plan_tipo === 'Día' || plan.plan_tipo === 'Dia';

  let currentDate = new Date(plan.fecha_inicio);
  
  if (isShortPlan) {
    let validDaysCounted = 0;

    // If the start day itself is valid (not Sunday), it counts as day 1.
    if (getDay(currentDate) !== 0) {
      validDaysCounted = 1;
    }

    // Keep adding days until we have counted the required number of active days
    while (validDaysCounted < daysActive) {
      currentDate = addDays(currentDate, 1);
      if (getDay(currentDate) !== 0) {
        validDaysCounted++;
      }
    }
  } else {
    // For biweekly/monthly, just add calendar days. 
    // Since day 1 is the start date, we add daysActive - 1.
    currentDate = addDays(currentDate, daysActive - 1);
  }

  return endOfDay(currentDate);
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
