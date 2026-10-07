-- Migration: 20261007015030_user_sessions_and_staff_online_status
-- Add is_online column to staff
ALTER TABLE staff ADD COLUMN IF NOT EXISTS is_online BOOLEAN NOT NULL DEFAULT false;

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type TEXT NOT NULL CHECK (user_type IN ('staff', 'client')),
  action TEXT NOT NULL CHECK (action IN ('login', 'logout')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE user_sessions IS 'Tracks historical login and logout events for users.';

-- Enable RLS on user_sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to insert their own sessions"
  ON user_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "Allow staff with manage_staff role to view user sessions"
  ON user_sessions
  FOR SELECT
  TO authenticated
  USING (
    has_role('manage_staff') OR auth_user_id = auth.uid()
  );
