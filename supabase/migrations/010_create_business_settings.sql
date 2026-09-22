CREATE TABLE business_settings (
    id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    name text NOT NULL DEFAULT 'NovaFit',
    phone text,
    address text,
    logo_url text,
    updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to business_settings"
    ON business_settings FOR SELECT
    USING (true);

CREATE POLICY "Allow staff to update business_settings"
    ON business_settings FOR UPDATE
    USING (auth.uid() IN (SELECT auth_user_id FROM staff));

CREATE POLICY "Allow staff to insert business_settings"
    ON business_settings FOR INSERT
    WITH CHECK (auth.uid() IN (SELECT auth_user_id FROM staff));

-- Insert default row
INSERT INTO business_settings (id, name) VALUES (1, 'NovaFit') ON CONFLICT DO NOTHING;

-- Create storage bucket for public assets if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('assets', 'assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'assets');

CREATE POLICY "Staff Upload Access" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'assets' AND auth.uid() IN (SELECT auth_user_id FROM staff));

CREATE POLICY "Staff Update Access" 
ON storage.objects FOR UPDATE 
WITH CHECK (bucket_id = 'assets' AND auth.uid() IN (SELECT auth_user_id FROM staff));

CREATE POLICY "Staff Delete Access" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'assets' AND auth.uid() IN (SELECT auth_user_id FROM staff));
