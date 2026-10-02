-- Fix update_updated_at_column trigger function to respect explicitly provided values
-- This allows simulated testing to work correctly when appDate is passed in

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  -- If the application did not explicitly modify updated_at, set it to now()
  IF NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at THEN
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
