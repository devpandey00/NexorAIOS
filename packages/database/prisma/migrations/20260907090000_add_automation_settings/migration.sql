CREATE TABLE IF NOT EXISTS public.automation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key varchar(100) NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT true,
  config jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_settings_enabled
  ON public.automation_settings(enabled);

INSERT INTO public.automation_settings (key, enabled)
VALUES
  ('campaign_discovery', true),
  ('scheduler', true),
  ('job_autopilot', true),
  ('autopilot', true),
  ('whatsapp_generation', true),
  ('whatsapp_sending', true),
  ('followups', true),
  ('outreach', true),
  ('social_publishing', true),
  ('daily_reports', true)
ON CONFLICT (key) DO NOTHING;
