-- Migration: 20261123000000_create_inventory_module
-- Replicates the Treinta.co inventory schema (categories, products, product_images, product_history)
-- and adds granular RBAC roles for viewing, creating, editing, and deleting inventory products.

-- ─── 1. Product Categories ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  UUID REFERENCES staff(id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES staff(id) ON DELETE SET NULL
);

COMMENT ON TABLE product_categories IS 'Product categories for the inventory module.';

DROP TRIGGER IF EXISTS product_categories_updated_at ON product_categories;
CREATE TRIGGER product_categories_updated_at
  BEFORE UPDATE ON product_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS product_categories_audit_fields ON product_categories;
CREATE TRIGGER product_categories_audit_fields
  BEFORE INSERT OR UPDATE ON product_categories
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

-- ─── 2. Products ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS products (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  description          TEXT,
  sku                  TEXT,
  barcode              TEXT,
  price                NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  cost                 NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
  quantity_available   NUMERIC(12, 2) NOT NULL DEFAULT 0,
  low_stock_threshold  NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (low_stock_threshold >= 0),
  unit                 TEXT NOT NULL DEFAULT 'unit',
  unit_category        TEXT NOT NULL DEFAULT 'count',
  category_id          UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  show_in_catalog      BOOLEAN NOT NULL DEFAULT true,
  deleted              BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by           UUID REFERENCES staff(id) ON DELETE SET NULL,
  updated_by           UUID REFERENCES staff(id) ON DELETE SET NULL
);

COMMENT ON TABLE products IS 'Inventory products with pricing, cost, stock quantity, unit of measurement, and category.';
COMMENT ON COLUMN products.unit IS 'Unit code, e.g. unit, kg, lb, g, oz, mg, l, ml, gal, fl_oz, m, cm, mm, in, ft, yd, m2, cm2, ft2.';
COMMENT ON COLUMN products.unit_category IS 'Unit group type: count, weight, volume, length, area.';

CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_deleted ON products(deleted);

DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS products_audit_fields ON products;
CREATE TRIGGER products_audit_fields
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

-- ─── 3. Product Images (Max 3 per product) ───────────────────────────────────

CREATE TABLE IF NOT EXISTS product_images (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url     TEXT NOT NULL,
  display_order SMALLINT NOT NULL DEFAULT 0 CHECK (display_order >= 0 AND display_order < 3),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by    UUID REFERENCES staff(id) ON DELETE SET NULL
);

COMMENT ON TABLE product_images IS 'Up to 3 pictures per inventory product, ordered by display_order (0..2).';

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);

-- ─── 4. Product History (Audit trail of creation and field-level updates) ────

CREATE TABLE IF NOT EXISTS product_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  action      TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
  field_name  TEXT,
  old_value   TEXT,
  new_value   TEXT,
  changed_by  UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE product_history IS 'Audit history recording when a product was created, updated (with field_name, old_value, new_value), or deleted.';

CREATE INDEX IF NOT EXISTS idx_product_history_product_id ON product_history(product_id, created_at DESC);

-- ─── 5. Trigger to automatically record product creation and updates ─────────

CREATE OR REPLACE FUNCTION log_product_history()
RETURNS TRIGGER AS $$
DECLARE
  v_staff_id UUID;
  v_old_cat  TEXT;
  v_new_cat  TEXT;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    SELECT id INTO v_staff_id FROM staff WHERE auth_user_id = auth.uid();
  END IF;

  IF v_staff_id IS NULL THEN
    v_staff_id := COALESCE(NEW.updated_by, NEW.created_by);
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO product_history (product_id, action, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, 'created', NULL, NULL, NEW.name, v_staff_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Soft delete check
    IF OLD.deleted = false AND NEW.deleted = true THEN
      INSERT INTO product_history (product_id, action, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, 'deleted', 'deleted', 'false', 'true', v_staff_id);
      RETURN NEW;
    END IF;

    IF OLD.name IS DISTINCT FROM NEW.name THEN
      INSERT INTO product_history (product_id, action, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, 'updated', 'name', OLD.name, NEW.name, v_staff_id);
    END IF;

    IF OLD.description IS DISTINCT FROM NEW.description THEN
      INSERT INTO product_history (product_id, action, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, 'updated', 'description', COALESCE(OLD.description, ''), COALESCE(NEW.description, ''), v_staff_id);
    END IF;

    IF OLD.price IS DISTINCT FROM NEW.price THEN
      INSERT INTO product_history (product_id, action, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, 'updated', 'price', OLD.price::TEXT, NEW.price::TEXT, v_staff_id);
    END IF;

    IF OLD.cost IS DISTINCT FROM NEW.cost THEN
      INSERT INTO product_history (product_id, action, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, 'updated', 'cost', OLD.cost::TEXT, NEW.cost::TEXT, v_staff_id);
    END IF;

    IF OLD.quantity_available IS DISTINCT FROM NEW.quantity_available THEN
      INSERT INTO product_history (product_id, action, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, 'updated', 'quantity_available', OLD.quantity_available::TEXT, NEW.quantity_available::TEXT, v_staff_id);
    END IF;

    IF OLD.low_stock_threshold IS DISTINCT FROM NEW.low_stock_threshold THEN
      INSERT INTO product_history (product_id, action, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, 'updated', 'low_stock_threshold', OLD.low_stock_threshold::TEXT, NEW.low_stock_threshold::TEXT, v_staff_id);
    END IF;

    IF OLD.unit IS DISTINCT FROM NEW.unit THEN
      INSERT INTO product_history (product_id, action, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, 'updated', 'unit', OLD.unit, NEW.unit, v_staff_id);
    END IF;

    IF OLD.category_id IS DISTINCT FROM NEW.category_id THEN
      SELECT name INTO v_old_cat FROM product_categories WHERE id = OLD.category_id;
      SELECT name INTO v_new_cat FROM product_categories WHERE id = NEW.category_id;
      INSERT INTO product_history (product_id, action, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, 'updated', 'category_id', COALESCE(v_old_cat, 'Sin categoría'), COALESCE(v_new_cat, 'Sin categoría'), v_staff_id);
    END IF;

    IF OLD.barcode IS DISTINCT FROM NEW.barcode THEN
      INSERT INTO product_history (product_id, action, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, 'updated', 'barcode', COALESCE(OLD.barcode, ''), COALESCE(NEW.barcode, ''), v_staff_id);
    END IF;

    IF OLD.show_in_catalog IS DISTINCT FROM NEW.show_in_catalog THEN
      INSERT INTO product_history (product_id, action, field_name, old_value, new_value, changed_by)
      VALUES (NEW.id, 'updated', 'show_in_catalog', OLD.show_in_catalog::TEXT, NEW.show_in_catalog::TEXT, v_staff_id);
    END IF;

    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS products_history_trigger ON products;
CREATE TRIGGER products_history_trigger
  AFTER INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION log_product_history();

-- ─── 6. RBAC Roles for Inventory ─────────────────────────────────────────────

INSERT INTO roles (name, description)
VALUES
  ('view_products',   'Ver productos, categorías e historial del inventario'),
  ('create_products', 'Crear nuevos productos y categorías en el inventario'),
  ('edit_products',   'Editar precios, costos, stock y detalles de productos'),
  ('delete_products', 'Eliminar productos y categorías del inventario')
ON CONFLICT (name) DO NOTHING;

-- Grant inventory roles to Global Admin and Administrador
INSERT INTO profile_roles (profile_id, role_id)
SELECT p.id, r.id
FROM profiles p, roles r
WHERE p.name IN ('Global Admin', 'Administrador')
  AND r.name IN ('view_products', 'create_products', 'edit_products', 'delete_products')
ON CONFLICT DO NOTHING;

-- Grant view_products to Recepcionista by default so front desk can check product prices/stock
INSERT INTO profile_roles (profile_id, role_id)
SELECT p.id, r.id
FROM profiles p, roles r
WHERE p.name = 'Recepcionista'
  AND r.name IN ('view_products')
ON CONFLICT DO NOTHING;

-- ─── 7. Row Level Security Policies ──────────────────────────────────────────

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products           ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images     ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_history    ENABLE ROW LEVEL SECURITY;

-- Product Categories policies
CREATE POLICY "staff_read_product_categories" ON product_categories
  FOR SELECT TO authenticated
  USING (
    has_role('view_products') OR
    has_role('create_products') OR
    has_role('edit_products') OR
    has_role('delete_products') OR
    is_global_admin()
  );

CREATE POLICY "staff_insert_product_categories" ON product_categories
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role('create_products') OR
    has_role('edit_products') OR
    is_global_admin()
  );

CREATE POLICY "staff_update_product_categories" ON product_categories
  FOR UPDATE TO authenticated
  USING (
    has_role('edit_products') OR
    has_role('create_products') OR
    is_global_admin()
  )
  WITH CHECK (
    has_role('edit_products') OR
    has_role('create_products') OR
    is_global_admin()
  );

CREATE POLICY "staff_delete_product_categories" ON product_categories
  FOR DELETE TO authenticated
  USING (
    has_role('delete_products') OR
    is_global_admin()
  );

-- Products policies
CREATE POLICY "staff_read_products" ON products
  FOR SELECT TO authenticated
  USING (
    has_role('view_products') OR
    has_role('create_products') OR
    has_role('edit_products') OR
    has_role('delete_products') OR
    is_global_admin()
  );

CREATE POLICY "staff_insert_products" ON products
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role('create_products') OR
    is_global_admin()
  );

CREATE POLICY "staff_update_products" ON products
  FOR UPDATE TO authenticated
  USING (
    has_role('edit_products') OR
    has_role('delete_products') OR
    is_global_admin()
  )
  WITH CHECK (
    has_role('edit_products') OR
    has_role('delete_products') OR
    is_global_admin()
  );

CREATE POLICY "staff_delete_products" ON products
  FOR DELETE TO authenticated
  USING (
    has_role('delete_products') OR
    is_global_admin()
  );

-- Product Images policies
CREATE POLICY "staff_read_product_images" ON product_images
  FOR SELECT TO authenticated
  USING (
    has_role('view_products') OR
    has_role('create_products') OR
    has_role('edit_products') OR
    has_role('delete_products') OR
    is_global_admin()
  );

CREATE POLICY "staff_insert_product_images" ON product_images
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role('create_products') OR
    has_role('edit_products') OR
    is_global_admin()
  );

CREATE POLICY "staff_update_product_images" ON product_images
  FOR UPDATE TO authenticated
  USING (
    has_role('create_products') OR
    has_role('edit_products') OR
    is_global_admin()
  );

CREATE POLICY "staff_delete_product_images" ON product_images
  FOR DELETE TO authenticated
  USING (
    has_role('create_products') OR
    has_role('edit_products') OR
    has_role('delete_products') OR
    is_global_admin()
  );

-- Product History policies
CREATE POLICY "staff_read_product_history" ON product_history
  FOR SELECT TO authenticated
  USING (
    has_role('view_products') OR
    has_role('create_products') OR
    has_role('edit_products') OR
    has_role('delete_products') OR
    is_global_admin()
  );

CREATE POLICY "staff_insert_product_history" ON product_history
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role('create_products') OR
    has_role('edit_products') OR
    has_role('delete_products') OR
    is_global_admin()
  );


