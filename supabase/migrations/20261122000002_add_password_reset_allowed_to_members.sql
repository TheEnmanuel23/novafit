-- Migration: 20261122000002_add_password_reset_allowed_to_members
-- Add password_reset_allowed flag for 1-click admin-authorized password reset

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS password_reset_allowed BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN members.password_reset_allowed IS 'When true, allows the member to reset their password using only their username (1-click admin unlock).';

