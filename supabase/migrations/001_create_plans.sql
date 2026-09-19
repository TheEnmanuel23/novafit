-- Migration: 001_create_plans
-- Plans catalog — configurable per plan, no hardcoded defaults

CREATE TABLE IF NOT EXISTS plans (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description    TEXT NOT NULL,
  visits_included INTEGER NOT NULL,
  price          INTEGER NOT NULL,  -- in Córdobas (C$)
  max_balance    INTEGER NOT NULL,  -- configurable per plan, NOT a DB default
  expiration_days INTEGER NOT NULL, -- days from purchase until visits expire
  active         BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE plans IS 'System catalog of available gym membership plans';
COMMENT ON COLUMN plans.max_balance IS 'Maximum visit balance a member can hold on this plan (including rollover). Configurable, not hardcoded.';
COMMENT ON COLUMN plans.expiration_days IS 'Number of days from purchase/recharge until visits expire.';
