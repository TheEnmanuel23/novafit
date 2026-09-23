-- Migration: 013_add_audit_fields_to_all_tables
-- Adds created_by and updated_by to all tables, tracked via staff.auth_user_id

-- 1. Create the trigger function
CREATE OR REPLACE FUNCTION set_audit_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by = auth.uid();
    NEW.updated_by = auth.uid();
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.updated_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Add columns and triggers to each table

-- table: plans
ALTER TABLE plans ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES staff(auth_user_id) ON DELETE SET NULL;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES staff(auth_user_id) ON DELETE SET NULL;
DROP TRIGGER IF EXISTS plans_audit_fields ON plans;
CREATE TRIGGER plans_audit_fields
  BEFORE INSERT OR UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

-- table: members
ALTER TABLE members ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES staff(auth_user_id) ON DELETE SET NULL;
ALTER TABLE members ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES staff(auth_user_id) ON DELETE SET NULL;
DROP TRIGGER IF EXISTS members_audit_fields ON members;
CREATE TRIGGER members_audit_fields
  BEFORE INSERT OR UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

-- table: member_plans
ALTER TABLE member_plans ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES staff(auth_user_id) ON DELETE SET NULL;
ALTER TABLE member_plans ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES staff(auth_user_id) ON DELETE SET NULL;
DROP TRIGGER IF EXISTS member_plans_audit_fields ON member_plans;
CREATE TRIGGER member_plans_audit_fields
  BEFORE INSERT OR UPDATE ON member_plans
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

-- table: profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES staff(auth_user_id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES staff(auth_user_id) ON DELETE SET NULL;
DROP TRIGGER IF EXISTS profiles_audit_fields ON profiles;
CREATE TRIGGER profiles_audit_fields
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

-- table: roles
ALTER TABLE roles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES staff(auth_user_id) ON DELETE SET NULL;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES staff(auth_user_id) ON DELETE SET NULL;
DROP TRIGGER IF EXISTS roles_audit_fields ON roles;
CREATE TRIGGER roles_audit_fields
  BEFORE INSERT OR UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

-- table: profile_roles
ALTER TABLE profile_roles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES staff(auth_user_id) ON DELETE SET NULL;
ALTER TABLE profile_roles ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES staff(auth_user_id) ON DELETE SET NULL;
DROP TRIGGER IF EXISTS profile_roles_audit_fields ON profile_roles;
CREATE TRIGGER profile_roles_audit_fields
  BEFORE INSERT OR UPDATE ON profile_roles
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

-- table: staff
ALTER TABLE staff ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES staff(auth_user_id) ON DELETE SET NULL;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES staff(auth_user_id) ON DELETE SET NULL;
DROP TRIGGER IF EXISTS staff_audit_fields ON staff;
CREATE TRIGGER staff_audit_fields
  BEFORE INSERT OR UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

-- table: transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES staff(auth_user_id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES staff(auth_user_id) ON DELETE SET NULL;
DROP TRIGGER IF EXISTS transactions_audit_fields ON transactions;
CREATE TRIGGER transactions_audit_fields
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

-- table: attendances
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES staff(auth_user_id) ON DELETE SET NULL;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES staff(auth_user_id) ON DELETE SET NULL;
DROP TRIGGER IF EXISTS attendances_audit_fields ON attendances;
CREATE TRIGGER attendances_audit_fields
  BEFORE INSERT OR UPDATE ON attendances
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();

-- table: business_settings
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES staff(auth_user_id) ON DELETE SET NULL;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES staff(auth_user_id) ON DELETE SET NULL;
DROP TRIGGER IF EXISTS business_settings_audit_fields ON business_settings;
CREATE TRIGGER business_settings_audit_fields
  BEFORE INSERT OR UPDATE ON business_settings
  FOR EACH ROW EXECUTE FUNCTION set_audit_fields();
