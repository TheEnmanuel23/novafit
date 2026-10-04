-- Add plan_type key to plans table
ALTER TABLE plans ADD COLUMN IF NOT EXISTS "key" TEXT DEFAULT 'custom' NOT NULL;

-- Try to map existing plans to keys
UPDATE plans SET "key" = 'day' WHERE description ILIKE '%día%' OR description ILIKE '%dia%';
UPDATE plans SET "key" = 'month' WHERE description ILIKE '%mensual%';
UPDATE plans SET "key" = 'biweek' WHERE description ILIKE '%quincenal%';
31y1pRqq&7$w
