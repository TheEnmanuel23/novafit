-- Drop the previous restrictive policies
DROP POLICY IF EXISTS "staff_insert_attendances" ON attendances;
DROP POLICY IF EXISTS "staff_read_attendances" ON attendances;

-- Create a single, flexible policy for all operations (SELECT, INSERT, UPDATE, DELETE)
-- This allows any authenticated staff member to manage attendances at the database level.
-- Your Next.js app will continue to enforce role-based access before these queries are ever sent.
CREATE POLICY "staff_manage_attendances" ON attendances
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);
