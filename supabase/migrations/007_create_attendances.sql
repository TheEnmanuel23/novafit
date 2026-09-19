-- Migration: 007_create_attendances
-- QR scan / visit log

CREATE TABLE IF NOT EXISTS attendances (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id      UUID NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  member_plan_id UUID NOT NULL REFERENCES member_plans(id),
  balance_before INTEGER NOT NULL,
  balance_after  INTEGER NOT NULL,
  scanned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  registered_by  UUID REFERENCES staff(id)  -- NULL = kiosk (no staff auth)
);

COMMENT ON TABLE attendances IS 'Log of every QR scan / gym visit. Registered_by is NULL for kiosk check-ins.';
