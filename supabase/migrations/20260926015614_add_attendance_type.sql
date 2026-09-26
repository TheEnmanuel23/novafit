-- Add checkin_type to attendances
-- We will support 'qr', 'manual', etc.
ALTER TABLE attendances ADD COLUMN checkin_type text NOT NULL DEFAULT 'manual';


