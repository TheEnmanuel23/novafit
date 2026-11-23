-- Migration: 20261123010000_create_sales_module
-- Creates payment_methods, sales, and sale_items tables (supporting product sales and free sales / venta libre),
-- updates product_history logging when stock decreases from a sale, and adds RBAC roles for sales.

-- ─── 1. Payment Methods (Métodos de pago) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS payment_methods (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT UNIQUE NOT NULL,
  name        TEXT UNIQUE NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT true,
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  UUID REFERENCES staff(id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES staff(id) ON DELETE SET NULL
);

COMMENT ON TABLE payment_methods IS 'Payment methods available at checkout (Efectivo, Tarjeta, Transferencia bancaria, Tigo Money, Otro).';

DROP TRIGGER IF EXISTS payment_methods_updated_at ON payment_methods;
CREATE TRIGGER payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS payment_methods_audit_fields ON payment_methods;
CREATE TRIGGER payment_methods_audit_fields
  BEFORE INSERT OR UPDATE ON payment_methods
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

INSERT INTO payment_methods (key, name, active, sort_order)
VALUES
  ('cash',          'Efectivo',               true, 1),
  ('card',          'Tarjeta',                true, 2),
  ('bank_transfer', 'Transferencia bancaria', true, 3),
  ('tigo_money',    'Tigo Money',             true, 4),
  ('other',         'Otro',                   true, 5)
ON CONFLICT (key) DO NOTHING;

-- ─── 2. Sales (Ventas) ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sales (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_type                 TEXT NOT NULL DEFAULT 'products' CHECK (sale_type IN ('products', 'free')),
  sale_date                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  payment_status            TEXT NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'credit')),
  installments_count        INTEGER NOT NULL DEFAULT 1 CHECK (installments_count >= 1),
  payment_method_id         UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
  custom_payment_method     TEXT,
  assigned_staff_id         UUID REFERENCES staff(id) ON DELETE SET NULL,
  member_id                 UUID REFERENCES members(member_id) ON DELETE SET NULL,
  subtotal                  NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount                  NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total                     NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  receipt_name              TEXT,
  receipt_details           TEXT,
  deleted                   BOOLEAN NOT NULL DEFAULT false,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by                UUID REFERENCES staff(id) ON DELETE SET NULL,
  updated_by                UUID REFERENCES staff(id) ON DELETE SET NULL
);

COMMENT ON TABLE sales IS 'Sales records (both inventory product sales and free sales / venta libre).';
COMMENT ON COLUMN sales.assigned_staff_id IS 'Staff member to whom the sale is attributed (defaults to signed-in staff, editable on their behalf).';
COMMENT ON COLUMN sales.created_by IS 'Staff member who actually recorded the sale in the system.';
COMMENT ON COLUMN sales.payment_status IS 'paid = Pagada, credit = A crédito.';
COMMENT ON COLUMN sales.installments_count IS 'Number of payments/installments (1..6 or custom).';
COMMENT ON COLUMN sales.receipt_name IS 'Nombre del comprobante.';
COMMENT ON COLUMN sales.receipt_details IS 'Detalle del comprobante.';

CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date DESC);
CREATE INDEX IF NOT EXISTS idx_sales_assigned_staff_id ON sales(assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_sales_member_id ON sales(member_id);
CREATE INDEX IF NOT EXISTS idx_sales_deleted ON sales(deleted);

DROP TRIGGER IF EXISTS sales_updated_at ON sales;
CREATE TRIGGER sales_updated_at
  BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS sales_audit_fields ON sales;
CREATE TRIGGER sales_audit_fields
  BEFORE INSERT OR UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

-- ─── 3. Sale Items (Detalle de productos vendidos) ───────────────────────────

CREATE TABLE IF NOT EXISTS sale_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id     UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity    NUMERIC(12, 2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price  NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  unit_cost   NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  subtotal    NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  UUID REFERENCES staff(id) ON DELETE SET NULL
);

COMMENT ON TABLE sale_items IS 'Individual line items belonging to a sale. product_id is NULL for a free sale (venta libre).';

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);

-- ─── 4. RBAC Roles for Sales ─────────────────────────────────────────────────

INSERT INTO roles (name, description)
VALUES
  ('view_sales',   'Ver listado y detalle de ventas registradas'),
  ('create_sales', 'Registrar ventas de productos y ventas libres'),
  ('delete_sales', 'Anular o eliminar registros de ventas')
ON CONFLICT (name) DO NOTHING;

-- Grant sales roles to Global Admin and Administrador
INSERT INTO profile_roles (profile_id, role_id)
SELECT p.id, r.id
FROM profiles p, roles r
WHERE p.name IN ('Global Admin', 'Administrador')
  AND r.name IN ('view_sales', 'create_sales', 'delete_sales')
ON CONFLICT DO NOTHING;

-- Grant view_sales and create_sales to Recepcionista so front desk can register sales
INSERT INTO profile_roles (profile_id, role_id)
SELECT p.id, r.id
FROM profiles p, roles r
WHERE p.name = 'Recepcionista'
  AND r.name IN ('view_sales', 'create_sales')
ON CONFLICT DO NOTHING;

-- Allow staff who can create_sales to also update product quantities in inventory
DROP POLICY IF EXISTS "staff_update_products" ON products;
CREATE POLICY "staff_update_products" ON products
  FOR UPDATE TO authenticated
  USING (
    has_role('edit_products') OR
    has_role('create_sales') OR
    has_role('delete_products') OR
    is_global_admin()
  )
  WITH CHECK (
    has_role('edit_products') OR
    has_role('create_sales') OR
    has_role('delete_products') OR
    is_global_admin()
  );

DROP POLICY IF EXISTS "staff_insert_product_history" ON product_history;
CREATE POLICY "staff_insert_product_history" ON product_history
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role('create_products') OR
    has_role('edit_products') OR
    has_role('create_sales') OR
    has_role('delete_products') OR
    is_global_admin()
  );

-- ─── 5. Row Level Security for Sales Tables ──────────────────────────────────

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales           ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items      ENABLE ROW LEVEL SECURITY;

-- Payment Methods policies
CREATE POLICY "staff_read_payment_methods" ON payment_methods
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "admin_manage_payment_methods" ON payment_methods
  FOR ALL TO authenticated
  USING (has_role('manage_settings') OR is_global_admin())
  WITH CHECK (has_role('manage_settings') OR is_global_admin());

-- Sales policies
CREATE POLICY "staff_read_sales" ON sales
  FOR SELECT TO authenticated
  USING (
    has_role('view_sales') OR
    has_role('create_sales') OR
    has_role('delete_sales') OR
    has_role('view_reports') OR
    is_global_admin()
  );

CREATE POLICY "staff_insert_sales" ON sales
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role('create_sales') OR
    is_global_admin()
  );

CREATE POLICY "staff_update_sales" ON sales
  FOR UPDATE TO authenticated
  USING (
    has_role('create_sales') OR
    has_role('delete_sales') OR
    is_global_admin()
  )
  WITH CHECK (
    has_role('create_sales') OR
    has_role('delete_sales') OR
    is_global_admin()
  );

CREATE POLICY "staff_delete_sales" ON sales
  FOR DELETE TO authenticated
  USING (
    has_role('delete_sales') OR
    is_global_admin()
  );

-- Sale Items policies
CREATE POLICY "staff_read_sale_items" ON sale_items
  FOR SELECT TO authenticated
  USING (
    has_role('view_sales') OR
    has_role('create_sales') OR
    has_role('delete_sales') OR
    has_role('view_reports') OR
    is_global_admin()
  );

CREATE POLICY "staff_insert_sale_items" ON sale_items
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role('create_sales') OR
    is_global_admin()
  );

CREATE POLICY "staff_delete_sale_items" ON sale_items
  FOR DELETE TO authenticated
  USING (
    has_role('delete_sales') OR
    is_global_admin()
  );

