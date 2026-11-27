-- Migration: 20261126010000_add_view_balance_role
-- Separates full financial Balance access (`view_balance`) from daily cash register
-- operations (`manage_cash_register`) and reserves `view_reports` for the future Statistics module.

-- 1. Create `view_balance` role
INSERT INTO roles (name, description)
VALUES
  ('view_balance', 'Ver balance general completo, filtros históricos y todos los cierres de caja')
ON CONFLICT (name) DO NOTHING;

-- 2. Grant `view_balance` to Global Admin and Administrador only (not Recepcionista)
INSERT INTO profile_roles (profile_id, role_id)
SELECT p.id, r.id
FROM profiles p, roles r
WHERE p.name IN ('Global Admin', 'Administrador')
  AND r.name = 'view_balance'
ON CONFLICT DO NOTHING;

-- 3. Update SELECT RLS policies to recognize `view_balance`
DROP POLICY IF EXISTS "staff_read_sales" ON sales;
CREATE POLICY "staff_read_sales" ON sales
  FOR SELECT TO authenticated
  USING (
    has_role('view_balance') OR
    has_role('view_sales') OR
    has_role('create_sales') OR
    has_role('delete_sales') OR
    has_role('manage_cash_register') OR
    has_role('view_reports') OR
    is_global_admin()
  );

DROP POLICY IF EXISTS "staff_read_sale_items" ON sale_items;
CREATE POLICY "staff_read_sale_items" ON sale_items
  FOR SELECT TO authenticated
  USING (
    has_role('view_balance') OR
    has_role('view_sales') OR
    has_role('create_sales') OR
    has_role('delete_sales') OR
    has_role('manage_cash_register') OR
    has_role('view_reports') OR
    is_global_admin()
  );

DROP POLICY IF EXISTS "staff_read_cash_register_sessions" ON cash_register_sessions;
CREATE POLICY "staff_read_cash_register_sessions" ON cash_register_sessions
  FOR SELECT TO authenticated
  USING (
    has_role('view_balance') OR
    has_role('manage_cash_register') OR
    has_role('view_reports') OR
    is_global_admin()
  );
