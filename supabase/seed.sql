-- =============================================================================
-- NovaFit v2 — Seed Data
-- =============================================================================
-- Seeds: plans, roles, profiles, and profile→role assignments.
-- NOTE: No auth users are seeded. The first Global Admin is created via /setup.
-- =============================================================================

-- ─── Plans ────────────────────────────────────────────────────────────────────
INSERT INTO plans (description, visits_included, price, max_balance, expiration_days, active)
VALUES
  ('Día',             1,  50,  1,  1,  true),
  ('Quincenal',      15, 500, 20, 25,  true),
  ('Mensual',        30, 800, 40, 45,  true),
  ('Socio Fundador', 30, 550, 40, 45,  true)
ON CONFLICT DO NOTHING;

-- ─── Roles ────────────────────────────────────────────────────────────────────
INSERT INTO roles (name, description)
VALUES
  ('manage_members',   'Create, edit, and view member records and plans'),
  ('manage_staff',     'Create and manage staff accounts and profiles'),
  ('view_reports',     'Access reports and analytics dashboards'),
  ('process_checkin',  'Register gym visits (QR scan or username lookup)'),
  ('process_recharge', 'Process plan purchases and recharges for members')
ON CONFLICT (name) DO NOTHING;

-- ─── Profiles ─────────────────────────────────────────────────────────────────
INSERT INTO profiles (name, description, is_system)
VALUES
  ('Global Admin',   'Gym owner — full access, non-revocable', true),
  ('Administrador',  'Full access except Global Admin management',   false),
  ('Recepcionista',  'Front desk — check-in and recharge only',     false)
ON CONFLICT (name) DO NOTHING;

-- ─── Profile → Role assignments ───────────────────────────────────────────────

-- Global Admin gets ALL roles
INSERT INTO profile_roles (profile_id, role_id)
SELECT p.id, r.id
FROM profiles p, roles r
WHERE p.name = 'Global Admin'
ON CONFLICT DO NOTHING;

-- Administrador: everything except manage_staff (no creating other admins)
INSERT INTO profile_roles (profile_id, role_id)
SELECT p.id, r.id
FROM profiles p, roles r
WHERE p.name = 'Administrador'
  AND r.name IN ('manage_members', 'view_reports', 'process_checkin', 'process_recharge')
ON CONFLICT DO NOTHING;

-- Recepcionista: check-in and recharge only
INSERT INTO profile_roles (profile_id, role_id)
SELECT p.id, r.id
FROM profiles p, roles r
WHERE p.name = 'Recepcionista'
  AND r.name IN ('process_checkin', 'process_recharge')
ON CONFLICT DO NOTHING;
