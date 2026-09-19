-- Migration: 006_create_transactions
-- Audit log of every purchase/recharge

CREATE TABLE IF NOT EXISTS transactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id      UUID NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  member_plan_id UUID NOT NULL REFERENCES member_plans(id),
  plan_id        UUID NOT NULL REFERENCES plans(id),
  visits_added   INTEGER NOT NULL,
  balance_before INTEGER NOT NULL,
  balance_after  INTEGER NOT NULL,
  amount_paid    INTEGER NOT NULL,  -- in Córdobas (C$)
  registered_by  UUID REFERENCES staff(id),  -- NULL = kiosk/system
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE transactions IS 'Immutable audit log of every plan purchase and recharge.';
COMMENT ON COLUMN transactions.registered_by IS 'Staff who processed the transaction. NULL for automated/kiosk operations.';
