-- Migration: seed_rbac_reference_data
-- Roles, system profiles and their role assignments are required reference data
-- (e.g. /signup depends on the 'Global Admin' profile). seed.sql only runs on a
-- local `supabase db reset`, never on `supabase db push`, so remote environments
-- were missing them. This migration is idempotent and safe to run everywhere.

-- ─── Roles ───────────────────────────────────────────────────────────────────
INSERT INTO roles (name, description)
VALUES
  ('manage_members',   'Create, edit, and view member records and plans'),
  ('manage_staff',     'Create and manage staff accounts and profiles'),
  ('manage_settings',  'Modify business settings'),
  ('view_reports',     'Access reports and analytics dashboards'),
  ('process_checkin',  'Register gym visits (QR scan or username lookup)'),
  ('process_recharge', 'Process plan purchases and recharges for members'),
  ('checkin_qr',       'Process check-ins via QR code scan only'),
  ('checkin_manual',   'Process check-ins via manual member search only')
ON CONFLICT (name) DO NOTHING;

-- ─── Profiles ────────────────────────────────────────────────────────────────
INSERT INTO profiles (name, description, is_system)
VALUES
  ('Global Admin',   'Gym owner — full access, non-revocable',     true),
  ('Administrador',  'Full access except Global Admin management', false),
  ('Recepcionista',  'Front desk — check-in and recharge only',    false)
ON CONFLICT (name) DO NOTHING;

-- ─── Profile → Role assignments ──────────────────────────────────────────────

-- Global Admin gets ALL roles
INSERT INTO profile_roles (profile_id, role_id)
SELECT p.id, r.id
FROM profiles p, roles r
WHERE p.name = 'Global Admin'
ON CONFLICT DO NOTHING;

-- Administrador: everything except manage_staff
INSERT INTO profile_roles (profile_id, role_id)
SELECT p.id, r.id
FROM profiles p, roles r
WHERE p.name = 'Administrador'
  AND r.name IN (
    'manage_members', 'manage_settings', 'view_reports',
    'process_checkin', 'process_recharge', 'checkin_qr', 'checkin_manual'
  )
ON CONFLICT DO NOTHING;

-- Recepcionista: check-in and recharge only
INSERT INTO profile_roles (profile_id, role_id)
SELECT p.id, r.id
FROM profiles p, roles r
WHERE p.name = 'Recepcionista'
  AND r.name IN ('process_checkin', 'process_recharge')
ON CONFLICT DO NOTHING;
