ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS application_url text,
  ADD COLUMN IF NOT EXISTS application_status varchar(32) NOT NULL DEFAULT 'READY',
  ADD COLUMN IF NOT EXISTS applied_at timestamptz,
  ADD COLUMN IF NOT EXISTS application_error text;

CREATE INDEX IF NOT EXISTS idx_opportunities_application_status
  ON public.opportunities(application_status, created_at DESC);
