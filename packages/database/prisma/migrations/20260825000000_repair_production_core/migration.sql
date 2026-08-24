-- Production repair migration.
-- Some environments had migration history recorded while core tables were
-- missing because the database was bootstrapped manually. This migration is
-- intentionally idempotent and restores the core CRM/automation tables without
-- dropping existing data.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  item text;
BEGIN
  FOREACH item IN ARRAY ARRAY[
    'campaign_status','job_status','job_type','outreach_status',
    'outreach_channel','conversation_channel','message_direction',
    'follow_up_status','task_status','social_platform'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_type
      WHERE typname = item AND typnamespace = 'public'::regnamespace
    ) THEN
      IF item = 'campaign_status' THEN CREATE TYPE public.campaign_status AS ENUM ('DRAFT','QUEUED','RUNNING','PAUSED','COMPLETED','PARTIALLY_COMPLETED','FAILED','CANCELLED');
      ELSIF item = 'job_status' THEN CREATE TYPE public.job_status AS ENUM ('QUEUED','RUNNING','COMPLETED','FAILED','RETRYING','CANCELLED');
      ELSIF item = 'job_type' THEN CREATE TYPE public.job_type AS ENUM ('LEAD_DISCOVERY','SOCIAL_DISCOVERY','ENRICHMENT','RESEARCH','SEO','UX','BRAND','TECHNOLOGY','COMPETITOR','BUSINESS_INTELLIGENCE','SCORING','OUTREACH','FOLLOW_UP','ANALYTICS');
      ELSIF item = 'outreach_status' THEN CREATE TYPE public.outreach_status AS ENUM ('DRAFT','APPROVAL_REQUIRED','APPROVED','SCHEDULED','SENT','FAILED','CANCELLED');
      ELSIF item = 'outreach_channel' THEN CREATE TYPE public.outreach_channel AS ENUM ('WHATSAPP','EMAIL','INSTAGRAM','LINKEDIN','FACEBOOK','SMS');
      ELSIF item = 'conversation_channel' THEN CREATE TYPE public.conversation_channel AS ENUM ('WHATSAPP','EMAIL','INSTAGRAM','LINKEDIN','FACEBOOK','SMS');
      ELSIF item = 'message_direction' THEN CREATE TYPE public.message_direction AS ENUM ('INBOUND','OUTBOUND');
      ELSIF item = 'follow_up_status' THEN CREATE TYPE public.follow_up_status AS ENUM ('PENDING','SCHEDULED','COMPLETED','CANCELLED');
      ELSIF item = 'task_status' THEN CREATE TYPE public.task_status AS ENUM ('TODO','IN_PROGRESS','COMPLETED','CANCELLED');
      ELSIF item = 'social_platform' THEN CREATE TYPE public.social_platform AS ENUM ('INSTAGRAM','FACEBOOK','LINKEDIN','YOUTUBE','X','TIKTOK');
      END IF;
    END IF;
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid NOT NULL DEFAULT gen_random_uuid(), name varchar(255) NOT NULL, query text NOT NULL,
  status public.campaign_status NOT NULL DEFAULT 'DRAFT', total_leads integer NOT NULL DEFAULT 0,
  processed_leads integer NOT NULL DEFAULT 0, successful_leads integer NOT NULL DEFAULT 0,
  failed_leads integer NOT NULL DEFAULT 0, started_at timestamptz(6), completed_at timestamptz(6),
  created_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT campaigns_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.campaign_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid(), campaign_id uuid NOT NULL, lead_id uuid NOT NULL,
  created_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT campaign_leads_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid(), campaign_id uuid, lead_id uuid, type public.job_type NOT NULL,
  status public.job_status NOT NULL DEFAULT 'QUEUED', attempts integer NOT NULL DEFAULT 0,
  "maxAttempts" integer NOT NULL DEFAULT 3, payload jsonb, result jsonb, error text,
  started_at timestamptz(6), completed_at timestamptz(6), created_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT jobs_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.agent_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid(), campaign_id uuid, lead_id uuid, agent varchar(100) NOT NULL,
  status public.job_status NOT NULL DEFAULT 'QUEUED', input jsonb, output jsonb, error text,
  started_at timestamptz(6), completed_at timestamptz(6), created_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT agent_runs_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.social_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(), lead_id uuid NOT NULL, platform public.social_platform NOT NULL,
  url varchar(500) NOT NULL, confidence integer NOT NULL DEFAULT 100, source varchar(255),
  created_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT social_profiles_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.outreach (
  id uuid NOT NULL DEFAULT gen_random_uuid(), lead_id uuid NOT NULL, campaign_id uuid,
  channel public.outreach_channel NOT NULL, status public.outreach_status NOT NULL DEFAULT 'DRAFT', message text NOT NULL,
  approved_at timestamptz(6), scheduled_at timestamptz(6), sent_at timestamptz(6),
  provider_message_id varchar(255), error text, created_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT outreach_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(), lead_id uuid NOT NULL, channel public.conversation_channel NOT NULL,
  status varchar(50) NOT NULL DEFAULT 'OPEN', last_message_at timestamptz(6),
  created_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT conversations_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(), conversation_id uuid NOT NULL, direction public.message_direction NOT NULL,
  content text NOT NULL, provider_message_id varchar(255), created_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT messages_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.follow_ups (
  id uuid NOT NULL DEFAULT gen_random_uuid(), lead_id uuid NOT NULL, status public.follow_up_status NOT NULL DEFAULT 'PENDING',
  scheduled_at timestamptz(6) NOT NULL, "attemptCount" integer NOT NULL DEFAULT 0, "maxAttempts" integer NOT NULL DEFAULT 3,
  notes text, created_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT follow_ups_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(), lead_id uuid, title varchar(255) NOT NULL, description text,
  status public.task_status NOT NULL DEFAULT 'TODO', priority integer NOT NULL DEFAULT 3, due_at timestamptz(6),
  created_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tasks_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.activity_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(), campaign_id uuid, type varchar(100) NOT NULL, message text NOT NULL,
  metadata jsonb, created_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT activity_events_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_campaign_lead ON public.campaign_leads(campaign_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created ON public.campaigns(created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON public.jobs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_campaign ON public.jobs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_jobs_lead ON public.jobs(lead_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_status ON public.agent_runs(agent, status);
CREATE INDEX IF NOT EXISTS idx_agent_runs_lead ON public.agent_runs(lead_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_social_platform ON public.social_profiles(lead_id, platform);
CREATE INDEX IF NOT EXISTS idx_social_profiles_platform ON public.social_profiles(platform);
CREATE INDEX IF NOT EXISTS idx_outreach_status_created ON public.outreach(status, created_at);
CREATE INDEX IF NOT EXISTS idx_outreach_lead ON public.outreach(lead_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_conversation_channel ON public.conversations(lead_id, channel);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON public.conversations(last_message_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_followups_status_scheduled ON public.follow_ups(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_followups_lead ON public.follow_ups(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status_due ON public.tasks(status, due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_lead ON public.tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_activity_campaign_created ON public.activity_events(campaign_id, created_at);
CREATE INDEX IF NOT EXISTS idx_activity_type_created ON public.activity_events(type, created_at);

-- Add foreign keys only when the referenced tables and constraints are absent.
DO $$
BEGIN
  IF to_regclass('public.leads') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='campaign_leads_campaign_id_fkey') THEN
    ALTER TABLE public.campaign_leads ADD CONSTRAINT campaign_leads_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF to_regclass('public.leads') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='campaign_leads_lead_id_fkey') THEN
    ALTER TABLE public.campaign_leads ADD CONSTRAINT campaign_leads_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF to_regclass('public.leads') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='jobs_lead_id_fkey') THEN
    ALTER TABLE public.jobs ADD CONSTRAINT jobs_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF to_regclass('public.campaigns') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='jobs_campaign_id_fkey') THEN
    ALTER TABLE public.jobs ADD CONSTRAINT jobs_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF to_regclass('public.leads') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='outreach_lead_id_fkey') THEN
    ALTER TABLE public.outreach ADD CONSTRAINT outreach_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF to_regclass('public.campaigns') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='outreach_campaign_id_fkey') THEN
    ALTER TABLE public.outreach ADD CONSTRAINT outreach_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
