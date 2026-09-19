-- Migration: 002_create_members
-- Members table — identity info ONLY (no visits, balances, or plan data)

CREATE TABLE IF NOT EXISTS members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  nombre      TEXT NOT NULL,
  telefono    TEXT,
  username    TEXT UNIQUE NOT NULL,  -- short human-readable ID, e.g. "ABCD-1234"
  qr_code     TEXT UNIQUE,           -- encodes member_id UUID for QR scanning
  deleted     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE members IS 'Gym member identity information. No visit balances or plan data stored here.';
COMMENT ON COLUMN members.member_id IS 'Stable public identity — used in QR codes and referenced by all related tables.';
COMMENT ON COLUMN members.username IS 'Short, unique, human-readable ID (e.g. ABCD-1234). Can be typed at the kiosk. Admin-generated, member can change.';
COMMENT ON COLUMN members.qr_code IS 'Encodes the member_id UUID. Scanned by the admin tablet camera for check-in.';

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
