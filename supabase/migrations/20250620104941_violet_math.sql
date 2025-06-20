/*
  # Create user progress flags table

  1. New Tables
    - `user_progress_flags`
      - `user_id` (uuid, primary key, references users.id)
      - `has_uploaded_cv` (boolean, default false)
      - `has_analyzed_cv` (boolean, default false)
      - `has_selected_job` (boolean, default false)
      - `has_written_cover_letter` (boolean, default false)
      - `has_published_job` (boolean, default false)
      - `has_applied_to_job` (boolean, default false)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `user_progress_flags` table
    - Add policies for users to manage their own progress flags
    - Add trigger for automatic updated_at timestamp updates

  3. Indexes
    - Add index on user_id for efficient lookups
*/

-- Create the user_progress_flags table
CREATE TABLE IF NOT EXISTS public.user_progress_flags (
    user_id uuid NOT NULL,
    has_uploaded_cv boolean DEFAULT false NOT NULL,
    has_analyzed_cv boolean DEFAULT false NOT NULL,
    has_selected_job boolean DEFAULT false NOT NULL,
    has_written_cover_letter boolean DEFAULT false NOT NULL,
    has_published_job boolean DEFAULT false NOT NULL,
    has_applied_to_job boolean DEFAULT false NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT user_progress_flags_pkey PRIMARY KEY (user_id),
    CONSTRAINT user_progress_flags_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_progress_flags_user_id ON public.user_progress_flags USING btree (user_id);

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