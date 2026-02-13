
// src/lib/types.ts

// Member types
export type PlanType = 'Mensual' | 'Quincenal' | 'Día';

export interface Member {
  id?: number; // Auto-incremented ID
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
  miembroId: number;
  fecha_hora: Date;
}

// Sync types
export interface SyncPayload {
  members: Member[];
  attendances: Attendance[];
}
