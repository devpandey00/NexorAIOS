DO $$
BEGIN
  CREATE TYPE public.meeting_status AS ENUM ('OFFERED','SCHEDULED','BOOKED','CANCELLED','COMPLETED','NO_SHOW');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.opportunity_stage AS ENUM ('OPEN','QUALIFIED','PROPOSAL','WON','LOST');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.activity_events
  ADD COLUMN IF NOT EXISTS lead_id UUID;

CREATE INDEX IF NOT EXISTS idx_activity_lead_created
  ON public.activity_events(lead_id, created_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'activity_events_lead_id_fkey'
  ) THEN
    ALTER TABLE public.activity_events
      ADD CONSTRAINT activity_events_lead_id_fkey
      FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID NOT NULL,
  lead_id UUID NOT NULL,
  opportunity_id UUID,
  title VARCHAR(255) NOT NULL,
  status public.meeting_status NOT NULL DEFAULT 'OFFERED',
  scheduled_at TIMESTAMPTZ(6),
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  meeting_url VARCHAR(1000),
  provider VARCHAR(100),
  provider_event_id VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT meetings_pkey PRIMARY KEY (id),
  CONSTRAINT meetings_provider_event_id_key UNIQUE (provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_meetings_lead_status
  ON public.meetings(lead_id, status);
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled
  ON public.meetings(scheduled_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'meetings_lead_id_fkey'
  ) THEN
    ALTER TABLE public.meetings
      ADD CONSTRAINT meetings_lead_id_fkey
      FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'meetings_opportunity_id_fkey'
  ) THEN
    ALTER TABLE public.meetings
      ADD CONSTRAINT meetings_opportunity_id_fkey
      FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id) ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- The legacy opportunities table is created by the earlier
-- 20260816191500_add_content_and_opportunities migration. Its shape is
-- reconciled to the current sales-pipeline model by the later
-- 20260905010000_reconcile_opportunities_and_proposals migration.
-- Proposals are also created by that reconciliation migration.
