-- Fix audit fields to reference staff(id) instead of staff(auth_user_id)

-- 1. Update the trigger function to use staff.id and allow manual overrides
CREATE OR REPLACE FUNCTION set_audit_fields()
RETURNS TRIGGER AS $$
DECLARE
  v_staff_id UUID;
BEGIN
  -- Get the staff id for the current auth.uid()
  IF auth.uid() IS NOT NULL THEN
    SELECT id INTO v_staff_id FROM staff WHERE auth_user_id = auth.uid();
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by IS NULL THEN
      NEW.created_by = v_staff_id;
    END IF;
    IF NEW.updated_by IS NULL THEN
      NEW.updated_by = v_staff_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.updated_by IS NULL OR NEW.updated_by = OLD.updated_by THEN
      NEW.updated_by = v_staff_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop old constraints and add new ones
DO $$
DECLARE
  t_name text;
  c_name text;
BEGIN
  FOR t_name IN SELECT unnest(ARRAY['plans', 'members', 'member_plans', 'profiles', 'roles', 'profile_roles', 'staff', 'transactions', 'attendances', 'business_settings'])
  LOOP
    -- Drop created_by constraint if it exists
    SELECT constraint_name INTO c_name
    FROM information_schema.key_column_usage
    WHERE table_name = t_name AND column_name = 'created_by' AND constraint_name LIKE '%fkey';
    
    IF c_name IS NOT NULL THEN
      EXECUTE 'ALTER TABLE ' || t_name || ' DROP CONSTRAINT ' || c_name;
    END IF;

    -- Drop updated_by constraint if it exists
    SELECT constraint_name INTO c_name
    FROM information_schema.key_column_usage
    WHERE table_name = t_name AND column_name = 'updated_by' AND constraint_name LIKE '%fkey';
    
    IF c_name IS NOT NULL THEN
      EXECUTE 'ALTER TABLE ' || t_name || ' DROP CONSTRAINT ' || c_name;
    END IF;

    -- Update existing data to use staff.id instead of auth_user_id
    EXECUTE 'UPDATE ' || t_name || ' t SET created_by = s.id FROM staff s WHERE t.created_by = s.auth_user_id';
    EXECUTE 'UPDATE ' || t_name || ' t SET updated_by = s.id FROM staff s WHERE t.updated_by = s.auth_user_id';

    -- Add new constraints
    EXECUTE 'ALTER TABLE ' || t_name || ' ADD CONSTRAINT ' || t_name || '_created_by_fkey FOREIGN KEY (created_by) REFERENCES staff(id) ON DELETE SET NULL';
    EXECUTE 'ALTER TABLE ' || t_name || ' ADD CONSTRAINT ' || t_name || '_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES staff(id) ON DELETE SET NULL';
  END LOOP;
END;
$$;
