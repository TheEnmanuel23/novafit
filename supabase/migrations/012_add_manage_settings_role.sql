-- Migration: 012_add_manage_settings_role
-- Add new role to manage business settings and restrict access

-- 1. Create the role
INSERT INTO roles (name, description)
VALUES ('manage_settings', 'Modify business settings')
ON CONFLICT (name) DO NOTHING;

-- 2. Assign to Global Admin and Administrador
INSERT INTO profile_roles (profile_id, role_id)
SELECT p.id, r.id
FROM profiles p, roles r
WHERE p.name IN ('Global Admin', 'Administrador')
  AND r.name = 'manage_settings'
ON CONFLICT DO NOTHING;

-- 3. Update business_settings policies
DROP POLICY IF EXISTS "Allow staff to update business_settings" ON business_settings;
DROP POLICY IF EXISTS "Allow staff to insert business_settings" ON business_settings;

CREATE POLICY "Allow staff to update business_settings"
    ON business_settings FOR UPDATE
    USING (has_role('manage_settings') OR is_global_admin());

CREATE POLICY "Allow staff to insert business_settings"
    ON business_settings FOR INSERT
    WITH CHECK (has_role('manage_settings') OR is_global_admin());

-- 4. Update storage.objects policies for assets bucket
DROP POLICY IF EXISTS "Staff Upload Access" ON storage.objects;
DROP POLICY IF EXISTS "Staff Update Access" ON storage.objects;
DROP POLICY IF EXISTS "Staff Delete Access" ON storage.objects;

CREATE POLICY "Staff Upload Access" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'assets' AND (has_role('manage_settings') OR is_global_admin()));

CREATE POLICY "Staff Update Access" 
ON storage.objects FOR UPDATE 
WITH CHECK (bucket_id = 'assets' AND (has_role('manage_settings') OR is_global_admin()));

CREATE POLICY "Staff Delete Access" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'assets' AND (has_role('manage_settings') OR is_global_admin()));
