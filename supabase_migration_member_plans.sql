-- Migration: Normalize Member Plans
-- This script contains all schema changes required to separate member plans from the members profiles.

-- 1. Ensure members table has a unique constraint on memberId (if not already present).
-- This is necessary to allow foreign key references from member_plans and attendances.
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'members_memberId_key') THEN
    ALTER TABLE public.members ADD CONSTRAINT members_memberId_key UNIQUE ("memberId");
  END IF;
END $$;

-- 2. Create member_plans table
CREATE TABLE IF NOT EXISTS public.member_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "memberId" UUID NOT NULL,
    plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
    plan_tipo TEXT NOT NULL,
    plan_days INTEGER NOT NULL DEFAULT 30,
    costo INTEGER NOT NULL DEFAULT 0,
    is_promo BOOLEAN DEFAULT false,
    notes TEXT,
    fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    registered_by TEXT,
    registered_by_name TEXT,
    deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Add Foreign Keys for member_plans
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'member_plans_memberId_fkey') THEN
    ALTER TABLE public.member_plans ADD CONSTRAINT member_plans_memberId_fkey FOREIGN KEY ("memberId") REFERENCES public.members("memberId") ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'member_plans_registered_by_fkey') THEN
    ALTER TABLE public.member_plans ADD CONSTRAINT member_plans_registered_by_fkey FOREIGN KEY (registered_by) REFERENCES public.staff("staffId") ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Add member_plan_id to attendances table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'attendances' AND column_name = 'member_plan_id') THEN
    ALTER TABLE public.attendances ADD COLUMN member_plan_id UUID;
  END IF;
END $$;

-- 5. Add Foreign Key for attendances mapping to member_plans
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendances_member_plan_id_fkey') THEN
    ALTER TABLE public.attendances ADD CONSTRAINT attendances_member_plan_id_fkey FOREIGN KEY (member_plan_id) REFERENCES public.member_plans(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 6. Enable Realtime triggers for the new table (Important for useLiveQuery functionality if syncing directly)
ALTER TABLE public.member_plans REPLICA IDENTITY FULL;

-- 7. Enable RLS and add basic permissive policies (match members table behavior)
ALTER TABLE public.member_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to member_plans" ON public.member_plans FOR ALL USING (true) WITH CHECK (true);

-- Note: Depending on your initial configuration, we left the legacy columns (plan_tipo, costo, etc.)
-- on the `members` table temporarily to ensure backward compatibility during migration. They can be dropped later.

-- 8. Cleanup legacy staff tracking columns from `members`
-- Since `member_plans` now tracks exactly who registered which plan, we drop the obsolete duplicates.
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'registered_by') THEN
    ALTER TABLE public.members DROP COLUMN registered_by;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'registered_by_name') THEN
    ALTER TABLE public.members DROP COLUMN registered_by_name;
  END IF;
END $$;
