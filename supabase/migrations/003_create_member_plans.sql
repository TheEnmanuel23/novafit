-- Migration: 003_create_member_plans
-- Core joiner table tracking active visit balance and plan assignment per member.
-- visits_remaining is DERIVED: visits_purchased - visits_used (not stored separately)

CREATE TABLE IF NOT EXISTS member_plans (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id         UUID NOT NULL REFERENCES members(member_id) ON DELETE CASCADE,
  plan_id           UUID NOT NULL REFERENCES plans(id),
  visits_purchased  INTEGER NOT NULL,          -- includes rollover at recharge time
  visits_used       INTEGER NOT NULL DEFAULT 0,
  expiration_date   TIMESTAMPTZ NOT NULL,       -- recharge_date + plan.expiration_days
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE member_plans IS 'Active relationship between a member and a plan. One active record per member at a time.';
COMMENT ON COLUMN member_plans.visits_purchased IS 'Total visits loaded into this record, including any rollover from previous plan.';
COMMENT ON COLUMN member_plans.visits_used IS 'Incremented on each check-in. visits_remaining = visits_purchased - visits_used.';
COMMENT ON COLUMN member_plans.expiration_date IS 'Calculated: recharge_date + plan.expiration_days. Stored for fast querying.';

CREATE TRIGGER member_plans_updated_at
  BEFORE UPDATE ON member_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
