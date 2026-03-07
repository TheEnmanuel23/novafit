
// src/lib/types.ts

import { Database } from './database.types';

// Member types
export type PlanType = Database['public']['Tables']['plans']['Row']['description'];

export interface SystemPlan {
  id: string;
  description: string;
  price: number;
  days_active: number;
  active: boolean;
}

export interface Member {
  id?: number; // Keep for backward compatibility if needed, though Supabase might use it as bigserial. Let's assume memberId is the main UUID.
  memberId: string; // Stable ID for the user entity (links multiple plans)
  nombre: string;
  telefono: string;
  deleted?: boolean; // Soft delete flag
  updated_at?: Date | string;
}

export interface MemberPlan {
  id: string; // UUID mapped to Supabase 'id'
  memberId: string; // User identity
  plan_id?: string; // ID referencing the 'plans' system catalog
  plan_tipo: PlanType;
  plan_days: number;
  costo: number;
  is_promo?: boolean;
  notes?: string;
  fecha_inicio: Date | string;
  deleted?: boolean;
  updated_at?: Date | string;
  registered_by?: string;
  registered_by_name?: string;
}

export interface Attendance {
  id?: number | string; 
  memberId: string; // Stable User Identity ID
  member_plan_id?: string;
  fecha_hora: Date | string;
  created_at?: Date | string;
}

// Staff / User types
export type StaffRole = 'super_admin' | 'admin';

export interface Staff {
  id?: number | string;
  staffId?: string; // Manual String ID or UUID
  nombre: string;
  username: string;
  password: string;
  role: StaffRole;
  created_at: Date | string;
  updated_at?: Date | string;
  deleted?: boolean;
}
