CREATE TABLE IF NOT EXISTS "public"."trend_references" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "source" varchar(100) NOT NULL,
  "url" varchar(1000) NOT NULL,
  "platform" varchar(30) NOT NULL,
  "topic" varchar(500) NOT NULL,
  "category" varchar(100),
  "relevance" integer NOT NULL DEFAULT 0,
  "content_opportunity" text,
  "creative_direction" text,
  "source_published_at" timestamptz(6),
  "fetched_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "trend_references_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "uq_trend_references_source_url" UNIQUE ("source", "url")
);

CREATE INDEX IF NOT EXISTS "idx_trend_references_platform_relevance" ON "public"."trend_references"("platform", "relevance");
CREATE INDEX IF NOT EXISTS "idx_trend_references_fetched_at" ON "public"."trend_references"("fetched_at");

CREATE TABLE IF NOT EXISTS "public"."social_analytics_snapshots" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "platform" varchar(30) NOT NULL,
  "post_id" uuid,
  "external_id" varchar(255),
  "snapshot_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reach" integer,
  "impressions" integer,
  "likes" integer,
  "comments" integer,
  "shares" integer,
  "saves" integer,
  "clicks" integer,
  "views" integer,
  "followers" integer,
  "engagement_rate" numeric(10,4),
  "raw" jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT "social_analytics_snapshots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "social_analytics_snapshots_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."content_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_social_analytics_platform_snapshot" ON "public"."social_analytics_snapshots"("platform", "snapshot_at");
CREATE INDEX IF NOT EXISTS "idx_social_analytics_post_snapshot" ON "public"."social_analytics_snapshots"("post_id", "snapshot_at");
CREATE INDEX IF NOT EXISTS "idx_social_analytics_external_id" ON "public"."social_analytics_snapshots"("external_id");
