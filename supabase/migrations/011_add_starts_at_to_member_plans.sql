-- Migration: 011_add_starts_at_to_member_plans
-- Adds starts_at to member_plans to track when a plan actually starts (for expiration calculation)

ALTER TABLE member_plans 
ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ NOT NULL DEFAULT now();

COMMENT ON COLUMN member_plans.starts_at IS 'The date the plan actively starts, used to calculate expiration_date.';
