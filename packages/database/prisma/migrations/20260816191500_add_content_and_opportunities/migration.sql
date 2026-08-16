CREATE TABLE IF NOT EXISTS public.content_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform varchar(32) NOT NULL,
  status varchar(32) NOT NULL DEFAULT 'DRAFT',
  title text NOT NULL,
  caption text NOT NULL,
  hashtags jsonb NOT NULL DEFAULT '[]'::jsonb,
  media_url text,
  scheduled_at timestamptz,
  published_at timestamptz,
  external_id varchar(255),
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_posts_status_scheduled
  ON public.content_posts(status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_content_posts_platform_created
  ON public.content_posts(platform, created_at);

CREATE TABLE IF NOT EXISTS public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind varchar(32) NOT NULL,
  title text NOT NULL,
  organization text,
  url text NOT NULL,
  source varchar(64),
  location varchar(255),
  contact text,
  notes text,
  status varchar(32) NOT NULL DEFAULT 'NEW',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(kind, url)
);

CREATE INDEX IF NOT EXISTS idx_opportunities_kind_status
  ON public.opportunities(kind, status);

CREATE INDEX IF NOT EXISTS idx_opportunities_created
  ON public.opportunities(created_at DESC);
