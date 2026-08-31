CREATE TABLE IF NOT EXISTS "public"."social_content_strategies" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "fingerprint" varchar(64) NOT NULL,
  "trend_id" uuid,
  "platform" varchar(30) NOT NULL,
  "niche" varchar(255) NOT NULL,
  "goal" varchar(500) NOT NULL,
  "audience" varchar(500) NOT NULL,
  "offer" varchar(500),
  "strategy" jsonb NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "social_content_strategies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "uq_social_content_strategies_fingerprint" UNIQUE ("fingerprint"),
  CONSTRAINT "social_content_strategies_trend_id_fkey" FOREIGN KEY ("trend_id") REFERENCES "public"."trend_references"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_social_content_strategies_platform_created" ON "public"."social_content_strategies"("platform", "created_at");
CREATE INDEX IF NOT EXISTS "idx_social_content_strategies_trend" ON "public"."social_content_strategies"("trend_id");
