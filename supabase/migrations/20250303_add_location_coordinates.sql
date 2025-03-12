-- Add latitude and longitude columns to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
