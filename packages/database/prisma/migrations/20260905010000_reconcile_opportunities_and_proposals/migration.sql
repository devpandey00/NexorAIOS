DO $$
BEGIN
  CREATE TYPE public.opportunity_stage AS ENUM ('OPEN','QUALIFIED','PROPOSAL','WON','LOST');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS lead_id uuid,
  ADD COLUMN IF NOT EXISTS campaign_id uuid,
  ADD COLUMN IF NOT EXISTS name varchar(255),
  ADD COLUMN IF NOT EXISTS stage public.opportunity_stage NOT NULL DEFAULT 'OPEN',
  ADD COLUMN IF NOT EXISTS value numeric(12,2),
  ADD COLUMN IF NOT EXISTS currency varchar(10),
  ADD COLUMN IF NOT EXISTS owner varchar(255),
  ADD COLUMN IF NOT EXISTS loss_reason text,
  ADD COLUMN IF NOT EXISTS won_at timestamptz,
  ADD COLUMN IF NOT EXISTS lost_at timestamptz;

UPDATE public.opportunities
SET name = COALESCE(NULLIF(name, ''), NULLIF(title, ''), 'Untitled opportunity')
WHERE name IS NULL OR name = '';

UPDATE public.opportunities
SET stage = CASE UPPER(COALESCE(status, 'NEW'))
  WHEN 'WON' THEN 'WON'::public.opportunity_stage
  WHEN 'LOST' THEN 'LOST'::public.opportunity_stage
  WHEN 'QUALIFIED' THEN 'QUALIFIED'::public.opportunity_stage
  WHEN 'PROPOSAL' THEN 'PROPOSAL'::public.opportunity_stage
  ELSE 'OPEN'::public.opportunity_stage
END;

WITH new_leads AS (
  INSERT INTO public.leads (id, business_name, niche, country, status, notes)
  SELECT
    gen_random_uuid(),
    LEFT(COALESCE(NULLIF(o.organization, ''), NULLIF(o.title, ''), 'Legacy opportunity'), 255),
    'legacy-opportunity',
    LEFT(COALESCE(NULLIF(o.location, ''), 'Unknown'), 100),
    'NEW'::public.lead_status,
    'Created while reconciling the legacy opportunities table: ' || o.id::text
  FROM public.opportunities o
  WHERE o.lead_id IS NULL
  RETURNING id, notes
)
UPDATE public.opportunities o
SET lead_id = nl.id
FROM new_leads nl
WHERE nl.notes = 'Created while reconciling the legacy opportunities table: ' || o.id::text;

ALTER TABLE public.opportunities
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN lead_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_opportunities_lead_id') THEN
    ALTER TABLE public.opportunities
      ADD CONSTRAINT fk_opportunities_lead_id
      FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_opportunities_campaign_id') THEN
    ALTER TABLE public.opportunities
      ADD CONSTRAINT fk_opportunities_campaign_id
      FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_opportunities_lead_stage
  ON public.opportunities(lead_id, stage);
CREATE INDEX IF NOT EXISTS idx_opportunities_campaign
  ON public.opportunities(campaign_id);

DO $$
BEGIN
  CREATE TYPE public.proposal_status AS ENUM ('DRAFT','SENT','ACCEPTED','REJECTED','EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  title varchar(255) NOT NULL,
  scope text NOT NULL,
  content text,
  value numeric(12,2),
  currency varchar(10),
  status public.proposal_status NOT NULL DEFAULT 'DRAFT',
  sent_at timestamptz,
  provider_message_id varchar(255),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposals_opportunity_status
  ON public.proposals(opportunity_id, status);
