-- Migration: 20261127010000_create_expenses_module
-- Creates expense_categories and expenses tables, adds cash/other expense totals
-- to cash_register_sessions, and adds RBAC roles & RLS policies for Gastos.

-- ─── 1. Expense Categories (Categorías de gastos) ────────────────────────────

CREATE TABLE IF NOT EXISTS expense_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT UNIQUE NOT NULL,
  description TEXT,
  deleted     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  UUID REFERENCES staff(id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES staff(id) ON DELETE SET NULL
);

COMMENT ON TABLE expense_categories IS 'Categories for organizing business expenses (Gastos).';

DROP TRIGGER IF EXISTS expense_categories_updated_at ON expense_categories;
CREATE TRIGGER expense_categories_updated_at
  BEFORE UPDATE ON expense_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS expense_categories_audit_fields ON expense_categories;
CREATE TRIGGER expense_categories_audit_fields
  BEFORE INSERT OR UPDATE ON expense_categories
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

INSERT INTO expense_categories (name, description)
VALUES
  ('Servicios públicos',       'Agua, electricidad, internet, teléfono'),
  ('Mantenimiento y limpieza', 'Productos de limpieza, reparaciones de equipos'),
  ('Suministros / Insumos',    'Papelería, consumibles y artículos operativos'),
  ('Compra de inventario',     'Reabastecimiento de productos para venta'),
  ('Salarios / Nómina',        'Pagos a personal, entrenadores y comisiones'),
  ('Alquiler',                 'Renta del local'),
  ('Marketing / Publicidad',   'Promociones, redes sociales y volantes'),
  ('Otros gastos',             'Gastos varios no categorizados')
ON CONFLICT (name) DO NOTHING;

-- ─── 2. Expenses (Gastos) ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS expenses (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id           UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  concept               TEXT NOT NULL,
  expense_date          TIMESTAMPTZ NOT NULL DEFAULT now(),
  payment_status        TEXT NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'credit')),
  payment_method_id     UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
  custom_payment_method TEXT,
  assigned_staff_id     UUID REFERENCES staff(id) ON DELETE SET NULL,
  total                 NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  notes                 TEXT,
  deleted               BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by            UUID REFERENCES staff(id) ON DELETE SET NULL,
  updated_by            UUID REFERENCES staff(id) ON DELETE SET NULL
);

COMMENT ON TABLE expenses IS 'Business expenses (Gastos). Paid expenses appear in Egresos and cash expenses reduce expected petty cash in Cierre de caja; credit expenses appear in Por pagar.';
COMMENT ON COLUMN expenses.payment_status IS 'paid = Pagada (Egresos), credit = Al crédito (Por pagar).';
COMMENT ON COLUMN expenses.assigned_staff_id IS 'Staff member responsible for or attributed to the expense.';

CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_assigned_staff_id ON expenses(assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_expenses_deleted ON expenses(deleted);

DROP TRIGGER IF EXISTS expenses_updated_at ON expenses;
CREATE TRIGGER expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS expenses_audit_fields ON expenses;
CREATE TRIGGER expenses_audit_fields
  BEFORE INSERT OR UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

-- ─── 3. Cash Register Sessions — Expense Totals ──────────────────────────────

ALTER TABLE cash_register_sessions
  ADD COLUMN IF NOT EXISTS cash_expenses_total  NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS other_expenses_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_expenses       NUMERIC(12, 2) NOT NULL DEFAULT 0;

-- ─── 4. RBAC Roles for Expenses ──────────────────────────────────────────────

INSERT INTO roles (name, description)
VALUES
  ('view_expenses',   'Ver listado y detalle de gastos registrados'),
  ('create_expenses', 'Registrar y editar gastos y categorías de gastos'),
  ('delete_expenses', 'Eliminar o anular registros de gastos')
ON CONFLICT (name) DO NOTHING;

-- Grant expense roles to Global Admin and Administrador
INSERT INTO profile_roles (profile_id, role_id)
SELECT p.id, r.id
FROM profiles p, roles r
WHERE p.name IN ('Global Admin', 'Administrador')
  AND r.name IN ('view_expenses', 'create_expenses', 'delete_expenses')
ON CONFLICT DO NOTHING;

-- Grant view_expenses and create_expenses to Recepcionista
INSERT INTO profile_roles (profile_id, role_id)
SELECT p.id, r.id
FROM profiles p, roles r
WHERE p.name = 'Recepcionista'
  AND r.name IN ('view_expenses', 'create_expenses')
ON CONFLICT DO NOTHING;

-- ─── 5. Row Level Security ───────────────────────────────────────────────────

ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses           ENABLE ROW LEVEL SECURITY;

-- Expense Categories policies
CREATE POLICY "staff_read_expense_categories" ON expense_categories
  FOR SELECT TO authenticated
  USING (
    has_role('view_expenses') OR
    has_role('create_expenses') OR
    has_role('delete_expenses') OR
    has_role('view_balance') OR
    has_role('manage_cash_register') OR
    has_role('view_reports') OR
    is_global_admin()
  );

CREATE POLICY "staff_insert_expense_categories" ON expense_categories
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role('create_expenses') OR
    is_global_admin()
  );

CREATE POLICY "staff_update_expense_categories" ON expense_categories
  FOR UPDATE TO authenticated
  USING (
    has_role('create_expenses') OR
    has_role('delete_expenses') OR
    is_global_admin()
  )
  WITH CHECK (
    has_role('create_expenses') OR
    has_role('delete_expenses') OR
    is_global_admin()
  );

-- Expenses policies
CREATE POLICY "staff_read_expenses" ON expenses
  FOR SELECT TO authenticated
  USING (
    has_role('view_expenses') OR
    has_role('create_expenses') OR
    has_role('delete_expenses') OR
    has_role('view_balance') OR
    has_role('manage_cash_register') OR
    has_role('view_reports') OR
    is_global_admin()
  );

CREATE POLICY "staff_insert_expenses" ON expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role('create_expenses') OR
    is_global_admin()
  );

CREATE POLICY "staff_update_expenses" ON expenses
  FOR UPDATE TO authenticated
  USING (
    has_role('create_expenses') OR
    has_role('delete_expenses') OR
    is_global_admin()
  )
  WITH CHECK (
    has_role('create_expenses') OR
    has_role('delete_expenses') OR
    is_global_admin()
  );

CREATE POLICY "staff_delete_expenses" ON expenses
  FOR DELETE TO authenticated
  USING (
    has_role('delete_expenses') OR
    is_global_admin()
  );

