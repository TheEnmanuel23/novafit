-- Migration: 20261122000001_add_email_to_members
-- Add optional email field to members (editable by member after logging in)

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS email TEXT;

COMMENT ON COLUMN members.email IS 'Optional email address, editable by the member in the consumer app.';

