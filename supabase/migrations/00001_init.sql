-- Create update_updated_at_column trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create minutes table
CREATE TABLE minutes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recording_id uuid,
    title text NOT NULL,
    content text NOT NULL DEFAULT '',
    tags text[] NOT NULL DEFAULT '{}',
    template_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_minutes_user_id ON minutes(user_id);
CREATE INDEX idx_minutes_updated_at ON minutes(updated_at);
CREATE INDEX idx_minutes_created_at ON minutes(created_at);

-- Create tags table
CREATE TABLE tags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    color text,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, name)
);

-- Create templates table
CREATE TABLE templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    content text NOT NULL,
    is_default boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create recordings table
CREATE TABLE recordings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    file_path text NOT NULL,
    duration_seconds integer NOT NULL DEFAULT 0,
    transcribed boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Apply updated_at trigger to minutes and templates
CREATE TRIGGER set_minutes_updated_at
    BEFORE UPDATE ON minutes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_templates_updated_at
    BEFORE UPDATE ON templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security on all tables
ALTER TABLE minutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;

-- RLS policies for minutes table
CREATE POLICY "Users can select their own minutes"
    ON minutes FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own minutes"
    ON minutes FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own minutes"
    ON minutes FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own minutes"
    ON minutes FOR DELETE
    USING (user_id = auth.uid());

-- RLS policies for tags table
CREATE POLICY "Users can select their own tags"
    ON tags FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own tags"
    ON tags FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own tags"
    ON tags FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own tags"
    ON tags FOR DELETE
    USING (user_id = auth.uid());

-- RLS policies for templates table
CREATE POLICY "Users can select their own templates"
    ON templates FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own templates"
    ON templates FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own templates"
    ON templates FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own templates"
    ON templates FOR DELETE
    USING (user_id = auth.uid());

-- RLS policies for recordings table
CREATE POLICY "Users can select their own recordings"
    ON recordings FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own recordings"
    ON recordings FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own recordings"
    ON recordings FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own recordings"
    ON recordings FOR DELETE
    USING (user_id = auth.uid());

-- Create recordings storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('recordings', 'recordings', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to recordings bucket
CREATE POLICY "Public access to recordings"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'recordings');

CREATE POLICY "Authenticated users can upload recordings"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'recordings' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own recordings"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'recordings' AND auth.uid() = owner);

CREATE POLICY "Users can delete their own recordings"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'recordings' AND auth.uid() = owner);
