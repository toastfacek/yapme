-- Create invites table for viral invite links
CREATE TABLE IF NOT EXISTS public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audio_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  -- Index for fast lookups by code
  CONSTRAINT invites_code_key UNIQUE (code)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invites_code ON public.invites(code);
CREATE INDEX IF NOT EXISTS idx_invites_sender_id ON public.invites(sender_id);

-- Enable RLS
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read invites (for landing page)
CREATE POLICY "Invites are publicly readable"
  ON public.invites
  FOR SELECT
  USING (true);

-- Policy: Users can create their own invites
CREATE POLICY "Users can create invites"
  ON public.invites
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Policy: Users can delete their own invites
CREATE POLICY "Users can delete their own invites"
  ON public.invites
  FOR DELETE
  USING (auth.uid() = sender_id);

