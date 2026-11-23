-- Migration: 20261123020000_create_cash_register_sessions
-- Creates cash_register_sessions table to support opening and closing the cash register ("Abrir caja" / "Cerrar caja")
-- and viewing the history of cash closures ("Cierres de caja") inside the Balance module.

-- ─── 1. Cash Register Sessions (Cierres de caja) ─────────────────────────────

CREATE TABLE IF NOT EXISTS cash_register_sessions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status               TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opening_amount       NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (opening_amount >= 0),
  cash_sales_total     NUMERIC(12, 2) NOT NULL DEFAULT 0,
  other_sales_total    NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_sales          NUMERIC(12, 2) NOT NULL DEFAULT 0,
  expected_cash_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  counted_cash_amount  NUMERIC(12, 2),
  difference_amount    NUMERIC(12, 2),
  notes                TEXT,
  opened_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at            TIMESTAMPTZ,
  opened_by            UUID REFERENCES staff(id) ON DELETE SET NULL,
  closed_by            UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by           UUID REFERENCES staff(id) ON DELETE SET NULL,
  updated_by           UUID REFERENCES staff(id) ON DELETE SET NULL
);

COMMENT ON TABLE cash_register_sessions IS 'Tracks cash register shifts: opening base amount, calculated sales during the shift, counted cash at close, and difference.';

CREATE INDEX IF NOT EXISTS idx_cash_register_sessions_status ON cash_register_sessions(status);
CREATE INDEX IF NOT EXISTS idx_cash_register_sessions_opened_at ON cash_register_sessions(opened_at DESC);

DROP TRIGGER IF EXISTS cash_register_sessions_updated_at ON cash_register_sessions;
CREATE TRIGGER cash_register_sessions_updated_at
  BEFORE UPDATE ON cash_register_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS cash_register_sessions_audit_fields ON cash_register_sessions;
CREATE TRIGGER cash_register_sessions_audit_fields
  BEFORE INSERT OR UPDATE ON cash_register_sessions
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

-- ─── 2. RBAC Role for Cash Register ──────────────────────────────────────────

INSERT INTO roles (name, description)
VALUES
  ('manage_cash_register', 'Abrir y cerrar caja, y consultar cierres de caja')
ON CONFLICT (name) DO NOTHING;

-- Grant manage_cash_register to Global Admin, Administrador, and Recepcionista
INSERT INTO profile_roles (profile_id, role_id)
SELECT p.id, r.id
FROM profiles p, roles r
WHERE p.name IN ('Global Admin', 'Administrador', 'Recepcionista')
  AND r.name IN ('manage_cash_register')
ON CONFLICT DO NOTHING;

-- ─── 3. Row Level Security ───────────────────────────────────────────────────

ALTER TABLE cash_register_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_read_cash_register_sessions" ON cash_register_sessions
  FOR SELECT TO authenticated
  USING (
    has_role('manage_cash_register') OR
    has_role('view_sales') OR
    has_role('create_sales') OR
    has_role('view_reports') OR
    is_global_admin()
  );

CREATE POLICY "staff_insert_cash_register_sessions" ON cash_register_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role('manage_cash_register') OR
    has_role('create_sales') OR
    is_global_admin()
  );

CREATE POLICY "staff_update_cash_register_sessions" ON cash_register_sessions
  FOR UPDATE TO authenticated
  USING (
    has_role('manage_cash_register') OR
    has_role('create_sales') OR
    is_global_admin()
  )
  WITH CHECK (
    has_role('manage_cash_register') OR
    has_role('create_sales') OR
    is_global_admin()
  );

