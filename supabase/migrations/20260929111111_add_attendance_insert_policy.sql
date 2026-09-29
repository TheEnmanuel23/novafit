-- Add INSERT policy for attendances for authenticated staff
CREATE POLICY "staff_insert_attendances" ON attendances
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role('process_checkin') OR
    has_role('manage_members') OR
    is_global_admin()
  );
