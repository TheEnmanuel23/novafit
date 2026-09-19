-- Migration: 004_create_rbac
-- RBAC system: profiles (named role collections) + roles + junction table

CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT UNIQUE NOT NULL,  -- e.g. 'Recepcionista', 'Administrador', 'Global Admin'
  description TEXT,
  is_system   BOOLEAN NOT NULL DEFAULT false, -- true = non-deletable (e.g. Global Admin)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE profiles IS 'Named collections of roles assigned to staff members.';
COMMENT ON COLUMN profiles.is_system IS 'System profiles cannot be deleted or have their Global Admin assignment revoked.';

-- ─── Roles ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT UNIQUE NOT NULL,  -- e.g. 'manage_members', 'process_checkin'
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE roles IS 'Individual permissions/capabilities that can be assigned to profiles.';

-- ─── Profile ↔ Role junction ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profile_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id     UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  UNIQUE (profile_id, role_id)
);

COMMENT ON TABLE profile_roles IS 'Many-to-many: which roles belong to each profile.';
