-- Migration: 20261127000000_add_staff_active_status
-- Adds `is_active` to `staff` so offboarded employees can be deactivated cleanly
-- while preserving audit history, and enforces `is_active = true` inside RLS helpers.

ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN staff.is_active IS 'Whether the staff account is active and allowed to authenticate and access the admin portal.';

CREATE INDEX IF NOT EXISTS idx_staff_is_active ON staff(is_active);

-- Update RLS helper functions so deactivated staff immediately lose all DB permissions
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
      AND s.is_active = true
      AND r.name = role_name
  ) INTO v_result;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

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
      AND s.is_active = true
      AND p.name = 'Global Admin'
  ) INTO v_result;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

