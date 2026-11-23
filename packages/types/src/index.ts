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
  email?: string | null;
  address?: string | null;
  date_of_birth?: string | null;
  password_reset_allowed?: boolean;
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
  starts_at?: string;
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
  | 'manage_settings'
  | 'view_reports'
  | 'process_checkin'
  | 'process_recharge'
  | 'checkin_qr'
  | 'checkin_manual'
  | 'view_products'
  | 'create_products'
  | 'edit_products'
  | 'delete_products'
  | 'view_sales'
  | 'create_sales'
  | 'delete_sales';

export interface Role {
  id: string;
  name: RoleName;
  description: string | null;
  created_at: string;
}

// ─── Inventory ───────────────────────────────────────────────────────────────

export type ProductUnitCategory = 'count' | 'weight' | 'volume' | 'length' | 'area';

export type ProductUnit =
  | 'unit'
  | 'box'
  | 'pack'
  | 'dozen'
  | 'pair'
  | 'kg'
  | 'lb'
  | 'g'
  | 'oz'
  | 'mg'
  | 'l'
  | 'ml'
  | 'gal'
  | 'fl_oz'
  | 'm'
  | 'cm'
  | 'mm'
  | 'in'
  | 'ft'
  | 'yd'
  | 'm2'
  | 'cm2'
  | 'ft2';

export interface ProductCategory {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  display_order: number;
  created_at: string;
  created_by: string | null;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  price: number;
  cost: number;
  quantity_available: number;
  low_stock_threshold: number;
  unit: ProductUnit | string;
  unit_category: ProductUnitCategory | string;
  category_id: string | null;
  show_in_catalog: boolean;
  deleted: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface ProductWithDetails extends Product {
  category: ProductCategory | null;
  images: ProductImage[];
}

export type ProductHistoryAction = 'created' | 'updated' | 'deleted';

export interface ProductHistory {
  id: string;
  product_id: string;
  action: ProductHistoryAction;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  created_at: string;
  staff?: {
    id: string;
    name: string;
    username: string;
  } | null;
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
  is_online: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffWithProfile extends Staff {
  profile: Profile & { roles: Role[] };
}

// ─── Composite / UI helpers ───────────────────────────────────────────────────

export type MemberStatus = 'active' | 'expired' | 'low_balance' | 'scheduled' | 'no_plan';

export interface MemberWithStatus extends Member {
  active_plan: MemberPlanWithDetails | null;
  scheduled_plans?: MemberPlanWithDetails[];
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

// ─── Sales ───────────────────────────────────────────────────────────────────

export interface PaymentMethod {
  id: string;
  key: string;
  name: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export type SaleType = 'products' | 'free';
export type SalePaymentStatus = 'paid' | 'credit';

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  subtotal: number;
  created_at: string;
  created_by: string | null;
}

export interface Sale {
  id: string;
  sale_type: SaleType;
  sale_date: string;
  payment_status: SalePaymentStatus;
  installments_count: number;
  payment_method_id: string | null;
  custom_payment_method: string | null;
  assigned_staff_id: string | null;
  member_id: string | null;
  subtotal: number;
  discount: number;
  total: number;
  receipt_name: string | null;
  receipt_details: string | null;
  deleted: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface SaleWithDetails extends Sale {
  items: SaleItem[];
  payment_method: PaymentMethod | null;
  assigned_staff: { id: string; name: string; username: string } | null;
  creator: { id: string; name: string; username: string } | null;
  member: { id: string; member_id: string; name: string; username: string } | null;
}

// ─── Database Gen Types ───────────────────────────────────────────────────────

export type { Database } from './database.types';
