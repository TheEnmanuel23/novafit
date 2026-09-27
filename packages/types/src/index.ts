// ─── Plans ────────────────────────────────────────────────────────────────────

export interface Plan {
  id: string;
  key: string;
  description: string;
  visits_included: number;
  price: number;
  max_balance: number;
  expiration_days: number;
  active: boolean;
  created_at: string;
}

// ─── Members ─────────────────────────────────────────────────────────────────

export interface Member {
  id: string;
  member_id: string;
  name: string;
  phone: string | null;
  username: string; // short unique human-readable ID e.g. "ABCD-1234"
  qr_code: string | null;
  deleted: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Member Plans ─────────────────────────────────────────────────────────────

export type MemberPlanStatus = 'active' | 'expired';

export interface MemberPlan {
  id: string;
  member_id: string;
  plan_id: string;
  visits_purchased: number;
  visits_used: number;
  expiration_date: string;
  status: MemberPlanStatus;
  created_at: string;
  updated_at: string;
}

export interface MemberPlanWithDetails extends MemberPlan {
  plan: Plan;
  visits_remaining: number; // computed: visits_purchased - visits_used
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  member_id: string;
  member_plan_id: string;
  plan_id: string;
  visits_added: number;
  balance_before: number;
  balance_after: number;
  amount_paid: number;
  registered_by: string | null;
  created_at: string;
}

// ─── Attendances ─────────────────────────────────────────────────────────────

export interface Attendance {
  id: string;
  member_id: string;
  member_plan_id: string;
  balance_before: number;
  balance_after: number;
  scanned_at: string;
  registered_by: string | null;
}

// ─── RBAC ────────────────────────────────────────────────────────────────────

export type RoleName =
  | 'manage_members'
  | 'manage_staff'
  | 'view_reports'
  | 'process_checkin'
  | 'process_recharge';

export interface Role {
  id: string;
  name: RoleName;
  description: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
}

export interface ProfileRole {
  id: string;
  profile_id: string;
  role_id: string;
}

// ─── Staff ────────────────────────────────────────────────────────────────────

export interface Staff {
  id: string;
  auth_user_id: string;
  name: string;
  username: string;
  email: string;
  profile_id: string;
  deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffWithProfile extends Staff {
  profile: Profile & { roles: Role[] };
}

// ─── Composite / UI helpers ───────────────────────────────────────────────────

export type MemberStatus = 'active' | 'expired' | 'low_balance' | 'no_plan';

export interface MemberWithStatus extends Member {
  active_plan: MemberPlanWithDetails | null;
  status: MemberStatus;
}

// ─── Check-in result ─────────────────────────────────────────────────────────

export type CheckInResultType = 'success' | 'no_plan' | 'expired' | 'no_visits';

export interface CheckInResult {
  type: CheckInResultType;
  member?: Member;
  balance_before?: number;
  balance_after?: number;
  expiration_date?: string;
  message: string;
}

// ─── Database Gen Types ───────────────────────────────────────────────────────

export type { Database } from './database.types';
