
// src/lib/types.ts

// Member types
export type PlanType = 'Mensual' | 'Quincenal' | 'Día';

export interface Member {
  id?: number; // Auto-incremented ID
  memberId?: string; // Stable ID for the user entity (links multiple plans)
  nombre: string;
  telefono: string;
  plan_tipo: PlanType;
  costo: number; // Price charged
  is_promo?: boolean; // Promotional price applied
  notes?: string; // Optional notes
  fecha_inicio: Date;
  deleted?: boolean; // Soft delete flag
}

// Attendance types
export interface Attendance {
  id?: number; // Auto-incremented ID
  miembroId: number; // Original Plan ID used for check-in
  memberId?: string; // Stable User Identity ID
  fecha_hora: Date;
}

// Sync types
export interface SyncPayload {
  members: Member[];
  attendances: Attendance[];
}
