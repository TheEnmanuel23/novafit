-- Migration: add_checkin_mode_roles
-- Splits process_checkin into two granular roles so kiosk devices can be
-- restricted to QR-only or manual-only check-in.

-- 1. Create the two new roles
INSERT INTO roles (name, description)
VALUES
  ('checkin_qr',     'Process check-ins via QR code scan only'),
  ('checkin_manual', 'Process check-ins via manual member search only')
ON CONFLICT (name) DO NOTHING;

-- 2. Grant both new roles to Global Admin and Administrador
--    (process_checkin holders keep full access; these are additive)
INSERT INTO profile_roles (profile_id, role_id)
SELECT p.id, r.id
FROM profiles p, roles r
WHERE p.name IN ('Global Admin', 'Administrador')
  AND r.name IN ('checkin_qr', 'checkin_manual')
ON CONFLICT DO NOTHING;

-- 3. Update attendance INSERT policy to also allow the granular roles
DROP POLICY IF EXISTS "staff_insert_attendances" ON attendances;

CREATE POLICY "staff_insert_attendances" ON attendances
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role('process_checkin') OR
    has_role('checkin_qr')      OR
    has_role('checkin_manual')  OR
    has_role('manage_members')  OR
    is_global_admin()
  );
