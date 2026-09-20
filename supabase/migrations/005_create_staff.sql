-- Migration: 005_create_staff
-- Staff accounts linked to Supabase Auth users

CREATE TABLE IF NOT EXISTS staff (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre       TEXT NOT NULL,
  username     TEXT UNIQUE NOT NULL,
  email        TEXT UNIQUE,
  profile_id   UUID NOT NULL REFERENCES profiles(id),
  deleted      BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE staff IS 'Staff accounts. Linked to Supabase Auth via auth_user_id. Permissions determined by assigned profile.';
COMMENT ON COLUMN staff.profile_id IS 'Assigned profile determines what roles/permissions this staff member has.';

CREATE TRIGGER staff_updated_at
  BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Helper function: check if the current auth user has a specific role
CREATE OR REPLACE FUNCTION has_role(role_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_result BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM staff s
    JOIN profile_roles pr ON pr.profile_id = s.profile_id
    JOIN roles r ON r.id = pr.role_id
    WHERE s.auth_user_id = auth.uid()
      AND s.deleted = false
      AND r.name = role_name
  ) INTO v_result;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function: check if the current auth user is a Global Admin
CREATE OR REPLACE FUNCTION is_global_admin()
RETURNS BOOLEAN AS $$
DECLARE
  v_result BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM staff s
    JOIN profiles p ON p.id = s.profile_id
    WHERE s.auth_user_id = auth.uid()
      AND s.deleted = false
      AND p.name = 'Global Admin'
  ) INTO v_result;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
