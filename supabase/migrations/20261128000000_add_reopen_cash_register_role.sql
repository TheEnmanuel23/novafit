-- Migration: 20261128000000_add_reopen_cash_register_role
-- Adds configurable RBAC permission `reopen_cash_register` so admins (or authorized profiles)
-- can reopen a previously closed cash register session.

INSERT INTO roles (name, description)
VALUES
  ('reopen_cash_register', 'Reabrir un cierre de caja cerrado anteriormente')
ON CONFLICT (name) DO NOTHING;

-- Grant reopen_cash_register to Global Admin and Administrador by default
INSERT INTO profile_roles (profile_id, role_id)
SELECT p.id, r.id
FROM profiles p, roles r
WHERE p.name IN ('Global Admin', 'Administrador')
  AND r.name = 'reopen_cash_register'
ON CONFLICT DO NOTHING;

-- Ensure cash_register_sessions UPDATE policy also allows reopen_cash_register
DROP POLICY IF EXISTS "staff_update_cash_register_sessions" ON cash_register_sessions;
CREATE POLICY "staff_update_cash_register_sessions" ON cash_register_sessions
  FOR UPDATE TO authenticated
  USING (
    has_role('manage_cash_register') OR
    has_role('reopen_cash_register') OR
    has_role('create_sales') OR
    is_global_admin()
  )
  WITH CHECK (
    has_role('manage_cash_register') OR
    has_role('reopen_cash_register') OR
    has_role('create_sales') OR
    is_global_admin()
  );

