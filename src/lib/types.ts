
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
  updated_at?: Date; // For sync
  synced?: number; // 0 = dirty, 1 = synced
  registered_by?: string; // staffId of creator
  registered_by_name?: string; // name of creator
}

// Attendance types
export interface Attendance {
  id?: number; // Auto-incremented ID
  miembroId: number; // Original Plan ID used for check-in
  memberId?: string; // Stable User Identity ID
  fecha_hora: Date;
  created_at?: Date;
  updated_at?: Date;
  synced?: number;
}

// Sync types
export interface SyncPayload {
  members: Member[];
  attendances: Attendance[];
}

// Staff / User types
export type StaffRole = 'super_admin' | 'admin';

export interface Staff {
  id?: number;
  staffId?: string; // Manual String ID or UUID
  nombre: string;
  username: string;
  password: string; // stored synched for offline auth (hashed ideally, but plain for prototype if needed)
  role: StaffRole;
  created_at: Date;
  updated_at?: Date;
  deleted?: boolean;
  synced?: number;
}
