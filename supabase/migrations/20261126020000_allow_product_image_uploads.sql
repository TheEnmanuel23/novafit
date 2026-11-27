-- Migration: 20261126020000_allow_product_image_uploads
-- Allows staff with product permissions (create_products, edit_products, delete_products)
-- to upload/update/delete product images under `products/` in the `assets` storage bucket.

DROP POLICY IF EXISTS "Staff Upload Access" ON storage.objects;
DROP POLICY IF EXISTS "Staff Update Access" ON storage.objects;
DROP POLICY IF EXISTS "Staff Delete Access" ON storage.objects;

CREATE POLICY "Staff Upload Access"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'assets'
  AND (
    is_global_admin()
    OR has_role('manage_settings')
    OR (
      name LIKE 'products/%'
      AND (
        has_role('create_products')
        OR has_role('edit_products')
      )
    )
  )
);

CREATE POLICY "Staff Update Access"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'assets'
  AND (
    is_global_admin()
    OR has_role('manage_settings')
    OR (
      name LIKE 'products/%'
      AND (
        has_role('create_products')
        OR has_role('edit_products')
      )
    )
  )
)
WITH CHECK (
  bucket_id = 'assets'
  AND (
    is_global_admin()
    OR has_role('manage_settings')
    OR (
      name LIKE 'products/%'
      AND (
        has_role('create_products')
        OR has_role('edit_products')
      )
    )
  )
);

CREATE POLICY "Staff Delete Access"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'assets'
  AND (
    is_global_admin()
    OR has_role('manage_settings')
    OR (
      name LIKE 'products/%'
      AND (
        has_role('edit_products')
        OR has_role('delete_products')
      )
    )
  )
);

