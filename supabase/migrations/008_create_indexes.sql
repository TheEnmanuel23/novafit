-- Migration: 008_create_indexes
-- Performance indexes for the most common query patterns

-- Members
CREATE INDEX IF NOT EXISTS idx_members_member_id ON members(member_id);
CREATE INDEX IF NOT EXISTS idx_members_username ON members(username);
CREATE INDEX IF NOT EXISTS idx_members_deleted ON members(deleted) WHERE deleted = false;

-- Member plans
CREATE INDEX IF NOT EXISTS idx_member_plans_member_id ON member_plans(member_id);
CREATE INDEX IF NOT EXISTS idx_member_plans_status ON member_plans(status);
CREATE INDEX IF NOT EXISTS idx_member_plans_active ON member_plans(member_id, status, expiration_date)
  WHERE status = 'active';

-- Attendances
CREATE INDEX IF NOT EXISTS idx_attendances_member_id ON attendances(member_id);
CREATE INDEX IF NOT EXISTS idx_attendances_scanned_at ON attendances(scanned_at DESC);


-- Transactions
CREATE INDEX IF NOT EXISTS idx_transactions_member_id ON transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- Staff
CREATE INDEX IF NOT EXISTS idx_staff_auth_user_id ON staff(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_staff_deleted ON staff(deleted) WHERE deleted = false;
