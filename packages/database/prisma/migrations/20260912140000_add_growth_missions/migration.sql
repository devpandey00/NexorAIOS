-- NexorAIOS Growth Command Center mission tracking.
-- Additive only; no existing data is modified or removed.
CREATE TABLE IF NOT EXISTS public.aios_growth_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  goal text NOT NULL,
  status varchar(24) NOT NULL DEFAULT 'PLANNED',
  plan jsonb NOT NULL DEFAULT '[]'::jsonb,
  result jsonb,
  progress integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS aios_growth_missions_user_created_idx
  ON public.aios_growth_missions(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.aios_growth_mission_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id uuid NOT NULL REFERENCES public.aios_growth_missions(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  key varchar(64) NOT NULL,
  label varchar(160) NOT NULL,
  status varchar(24) NOT NULL DEFAULT 'PENDING',
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb,
  approval_required boolean NOT NULL DEFAULT false,
  started_at timestamptz,
  completed_at timestamptz,
  error text,
  UNIQUE(mission_id, step_order)
);

CREATE INDEX IF NOT EXISTS aios_growth_mission_steps_mission_idx
  ON public.aios_growth_mission_steps(mission_id, step_order);
