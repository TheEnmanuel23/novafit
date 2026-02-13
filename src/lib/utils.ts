
// src/lib/utils.ts
import { addDays, isAfter, format, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { PlanType, Member } from './types';
import { ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Check membership status
// Check membership status
export function getMembershipStatus(member: Member): 'Active' | 'Expired' {
  let daysActive = 30;
  if (member.plan_tipo === 'Quincenal') daysActive = 15;
  if (member.plan_tipo === 'Día') daysActive = 1;

  const expirationDate = addDays(member.fecha_inicio, daysActive);
  
  if (isAfter(new Date(), expirationDate)) {
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
