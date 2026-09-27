-- Migration: Simplify salary structure from range (min/max) to single value
-- This makes the application form simpler and more intuitive for users

-- Step 1: Add new salary column (nullable to allow gradual migration)
ALTER TABLE applications ADD COLUMN IF NOT EXISTS salary NUMERIC;

-- Step 2: Migrate existing data
-- Use salary_max if available, otherwise salary_min, otherwise NULL
UPDATE applications 
SET salary = COALESCE(salary_max, salary_min)
WHERE salary IS NULL;

-- Step 3: Drop old columns
ALTER TABLE applications DROP COLUMN IF EXISTS salary_min;
ALTER TABLE applications DROP COLUMN IF EXISTS salary_max;

-- Note: currency column already exists and will be retained
