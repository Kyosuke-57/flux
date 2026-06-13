-- Add status column to tags table
ALTER TABLE tags
ADD COLUMN status text NOT NULL DEFAULT 'active'
CHECK (status IN ('active', 'archived'));

-- Backfill: all existing tags get 'active'
UPDATE tags SET status = 'active' WHERE status IS NULL;
