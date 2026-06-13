-- Create favorites table for bookmarking minutes
CREATE TABLE favorites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    minute_id uuid NOT NULL REFERENCES minutes(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, minute_id)
);

CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_minute_id ON favorites(minute_id);
CREATE INDEX idx_favorites_created_at ON favorites(created_at);

-- Enable Row Level Security
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can select their own favorites"
    ON favorites FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own favorites"
    ON favorites FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own favorites"
    ON favorites FOR DELETE
    USING (user_id = auth.uid());
