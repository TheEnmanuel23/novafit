-- Migration: 20261122000000_add_address_and_dob_to_members
-- Add optional address and date_of_birth fields to members (editable by member after logging in)

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE;

COMMENT ON COLUMN members.email IS 'Optional email address, editable by the member in the consumer app.';
COMMENT ON COLUMN members.address IS 'Optional residential address, editable by the member in the consumer app.';
COMMENT ON COLUMN members.date_of_birth IS 'Optional date of birth (YYYY-MM-DD), editable by the member in the consumer app.';

