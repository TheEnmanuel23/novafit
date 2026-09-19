-- Migration: 009_create_rls
-- Row Level Security policies for all tables

-- Enable RLS on all tables
ALTER TABLE plans          ENABLE ROW LEVEL SECURITY;
ALTER TABLE members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_plans   ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_roles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff          ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances    ENABLE ROW LEVEL SECURITY;

-- ─── Plans (read-only for all authenticated users) ───────────────────────────
CREATE POLICY "staff_read_plans" ON plans
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "admin_manage_plans" ON plans
  FOR ALL TO authenticated
  USING (is_global_admin())
  WITH CHECK (is_global_admin());

-- ─── Members ──────────────────────────────────────────────────────────────────
-- Staff with manage_members or process_checkin/recharge roles can read
CREATE POLICY "staff_read_members" ON members
  FOR SELECT TO authenticated
  USING (
    has_role('manage_members') OR
    has_role('process_checkin') OR
    has_role('process_recharge') OR
    is_global_admin()
  );

CREATE POLICY "staff_manage_members" ON members
  FOR ALL TO authenticated
  USING (has_role('manage_members') OR is_global_admin())
  WITH CHECK (has_role('manage_members') OR is_global_admin());

-- Service role (kiosk) bypasses RLS — handled at app layer with service key

-- ─── Member Plans ─────────────────────────────────────────────────────────────
CREATE POLICY "staff_read_member_plans" ON member_plans
  FOR SELECT TO authenticated
  USING (
    has_role('manage_members') OR
    has_role('process_checkin') OR
    has_role('process_recharge') OR
    is_global_admin()
  );

CREATE POLICY "staff_manage_member_plans" ON member_plans
  FOR ALL TO authenticated
  USING (has_role('process_recharge') OR has_role('manage_members') OR is_global_admin())
  WITH CHECK (has_role('process_recharge') OR has_role('manage_members') OR is_global_admin());

-- ─── Profiles ─────────────────────────────────────────────────────────────────
CREATE POLICY "staff_read_profiles" ON profiles
  FOR SELECT TO authenticated
  USING (true);  -- all staff can see profiles (needed for their own profile display)

CREATE POLICY "admin_manage_profiles" ON profiles
  FOR ALL TO authenticated
  USING (is_global_admin())
  WITH CHECK (is_global_admin() AND (NOT is_system OR name = 'Global Admin'));  -- protect system profiles

-- ─── Roles ────────────────────────────────────────────────────────────────────
CREATE POLICY "staff_read_roles" ON roles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "admin_manage_roles" ON roles
  FOR ALL TO authenticated
  USING (is_global_admin())
  WITH CHECK (is_global_admin());

-- ─── Profile Roles ────────────────────────────────────────────────────────────
CREATE POLICY "staff_read_profile_roles" ON profile_roles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "admin_manage_profile_roles" ON profile_roles
  FOR ALL TO authenticated
  USING (is_global_admin())
  WITH CHECK (is_global_admin());

-- ─── Staff ────────────────────────────────────────────────────────────────────
-- Staff can read their own record; Global Admin can read/write all
CREATE POLICY "staff_read_own" ON staff
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid() OR is_global_admin());

CREATE POLICY "admin_manage_staff" ON staff
  FOR ALL TO authenticated
  USING (is_global_admin())
  WITH CHECK (is_global_admin());

-- ─── Transactions ─────────────────────────────────────────────────────────────
CREATE POLICY "staff_read_transactions" ON transactions
  FOR SELECT TO authenticated
  USING (has_role('view_reports') OR has_role('process_recharge') OR is_global_admin());

CREATE POLICY "staff_insert_transactions" ON transactions
  FOR INSERT TO authenticated
  WITH CHECK (has_role('process_recharge') OR has_role('manage_members') OR is_global_admin());

-- ─── Attendances ──────────────────────────────────────────────────────────────
CREATE POLICY "staff_read_attendances" ON attendances
  FOR SELECT TO authenticated
  USING (
    has_role('view_reports') OR
    has_role('process_checkin') OR
    has_role('manage_members') OR
    is_global_admin()
  );

-- Note: attendance INSERT happens via service role key (kiosk) — bypasses RLS
-- For staff-authenticated check-ins (future), add an INSERT policy here
