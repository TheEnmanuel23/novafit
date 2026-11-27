-- Migration: 20261126000000_allow_edit_sale_items
-- Allows staff with create_sales permission to update/replace sale_items when editing a sale,
-- and allows staff with delete_sales permission to restore product stock when deleting a sale.

-- 1. Allow create_sales and delete_sales to update/delete sale_items
DROP POLICY IF EXISTS "staff_update_sale_items" ON sale_items;
CREATE POLICY "staff_update_sale_items" ON sale_items
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

DROP POLICY IF EXISTS "staff_delete_sale_items" ON sale_items;
CREATE POLICY "staff_delete_sale_items" ON sale_items
  FOR DELETE TO authenticated
  USING (
    has_role('create_sales') OR
    has_role('delete_sales') OR
    is_global_admin()
  );

-- 2. Allow delete_sales to restore product quantities in inventory when deleting a sale
DROP POLICY IF EXISTS "staff_update_products" ON products;
CREATE POLICY "staff_update_products" ON products
  FOR UPDATE TO authenticated
  USING (
    has_role('edit_products') OR
    has_role('create_sales') OR
    has_role('delete_sales') OR
    has_role('delete_products') OR
    is_global_admin()
  )
  WITH CHECK (
    has_role('edit_products') OR
    has_role('create_sales') OR
    has_role('delete_sales') OR
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
    has_role('delete_sales') OR
    has_role('delete_products') OR
    is_global_admin()
  );

