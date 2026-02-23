-- Nova Fit Supabase Schema Migration
-- Run this in the SQL Editor of your new "novafit-prod" Supabase project

-- 1. Create Tables
CREATE TABLE members (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    "memberId" uuid NOT NULL UNIQUE,
    nombre text NOT NULL,
    telefono text,
    plan_tipo text NOT NULL,
    costo numeric NOT NULL,
    is_promo boolean DEFAULT false,
    notes text,
    fecha_inicio timestamp with time zone NOT NULL,
    deleted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    registered_by text REFERENCES staff("staffId"),
    registered_by_name text,
    PRIMARY KEY (id)
);

CREATE TABLE attendances (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    "memberId" uuid NOT NULL,
    fecha_hora timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id),
    FOREIGN KEY ("memberId") REFERENCES members("memberId") ON DELETE CASCADE
);

CREATE TABLE staff (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    "staffId" text NOT NULL UNIQUE,
    nombre text NOT NULL,
    username text NOT NULL UNIQUE,
    password text NOT NULL,
    role text NOT NULL,
    deleted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (id)
);

-- 2. Configure Row Level Security (RLS)
-- Since it's offline-first and you are currently bypassing auth for simplicity, 
-- we need to disable RLS or allow all access (matching your current Dev setup).
-- WARNING: In a real public app, RLS policies must be stricter, but for an MVP MVP:
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to members" ON members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to attendances" ON attendances FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to staff" ON staff FOR ALL USING (true) WITH CHECK (true);
