/*
  # Fix user_progress_flags table structure

  1. New Tables
    - `user_progress_flags`
      - `id` (uuid, primary key, default: gen_random_uuid())
      - `user_id` (uuid, foreign key to users.id)
      - `has_uploaded_cv` (boolean, default: false)
      - `has_analyzed_cv` (boolean, default: false)
      - `has_selected_job` (boolean, default: false)
      - `has_written_cover_letter` (boolean, default: false)
      - `has_published_job` (boolean, default: false)
      - `has_applied_to_job` (boolean, default: false)
      - `created_at` (timestamptz, default: now())
      - `updated_at` (timestamptz, default: now())

  2. Security
    - Enable RLS on `user_progress_flags` table
    - Add policies for authenticated users to manage their own progress flags

  3. Triggers
    - Auto-update updated_at column on row updates

  4. Functions
    - Update handle_new_user function to create progress flags automatically
*/

-- Drop existing table if it exists to recreate with proper structure
DROP TABLE IF EXISTS public.user_progress_flags CASCADE;

-- Create the user_progress_flags table with proper structure
CREATE TABLE public.user_progress_flags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    has_uploaded_cv boolean DEFAULT false NOT NULL,
    has_analyzed_cv boolean DEFAULT false NOT NULL,
    has_selected_job boolean DEFAULT false NOT NULL,
    has_written_cover_letter boolean DEFAULT false NOT NULL,
    has_published_job boolean DEFAULT false NOT NULL,
    has_applied_to_job boolean DEFAULT false NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT user_progress_flags_user_id_unique UNIQUE (user_id)
);

-- Add index for efficient lookups
CREATE INDEX idx_user_progress_flags_user_id ON public.user_progress_flags(user_id);

-- Enable Row Level Security
ALTER TABLE public.user_progress_flags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can insert own progress flags"
    ON public.user_progress_flags
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read own progress flags"
    ON public.user_progress_flags
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own progress flags"
    ON public.user_progress_flags
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

-- Add trigger for automatic updated_at timestamp updates
CREATE TRIGGER update_user_progress_flags_updated_at
    BEFORE UPDATE ON public.user_progress_flags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update the handle_new_user function to create progress flags automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create user profile
  INSERT INTO public.users (id, email, full_name, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
    updated_at = NOW();
  
  -- Create user preferences
  INSERT INTO public.user_preferences (user_id, created_at, updated_at)
  VALUES (NEW.id, NOW(), NOW())
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Create user progress flags
  INSERT INTO public.user_progress_flags (user_id, created_at, updated_at)
  VALUES (NEW.id, NOW(), NOW())
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();