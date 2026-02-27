
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
  id?: number; // Auto-incremented ID
  memberId: string; // Stable ID for the user entity (links multiple plans)
  nombre: string;
  telefono: string;
  // Legacy plan fields kept optional for backward compatibility during migration
  plan_tipo?: PlanType;
  plan_days?: number;
  costo?: number;
  is_promo?: boolean;
  notes?: string;
  fecha_inicio?: Date;
  
  deleted?: boolean; // Soft delete flag
  updated_at?: Date; // For sync
  synced?: number; // 0 = dirty, 1 = synced
  registered_by?: string; // staffId of creator
  registered_by_name?: string; // name of creator
}

export interface MemberPlan {
  id?: number; // Dexie auto-increment
  sync_id: string; // UUID mapped to Supabase 'id'
  memberId: string; // User identity
  plan_id?: string; // ID referencing the 'plans' system catalog
  plan_tipo: PlanType;
  plan_days: number;
  costo: number;
  is_promo?: boolean;
  notes?: string;
  fecha_inicio: Date;
  deleted?: boolean;
  updated_at?: Date;
  synced?: number;
  registered_by?: string;
  registered_by_name?: string;
}

export interface Attendance {
  id?: number; // Auto-incremented ID
  miembroId: number; // Legacy local ID (keep for backward compat)
  memberId: string; // Stable User Identity ID
  member_plan_id?: string; // Maps to MemberPlan.sync_id and Supabase member_plans.id
  fecha_hora: Date;
  created_at?: Date;
  updated_at?: Date;
  synced?: number;
}

// Sync types
export interface SyncPayload {
  members: Member[];
  member_plans?: MemberPlan[];
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
