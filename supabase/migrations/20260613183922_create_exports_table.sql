-- Create exports table for tracking export history
CREATE TABLE exports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    minute_id uuid REFERENCES minutes(id) ON DELETE SET NULL,
    title text NOT NULL,
    format text NOT NULL CHECK (format IN ('txt', 'md', 'pdf')),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_exports_user_id ON exports(user_id);
CREATE INDEX idx_exports_minute_id ON exports(minute_id);
CREATE INDEX idx_exports_created_at ON exports(created_at);

-- Enable Row Level Security
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can select their own exports"
    ON exports FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own exports"
    ON exports FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own exports"
    ON exports FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own exports"
    ON exports FOR DELETE
    USING (user_id = auth.uid());
