CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS "public"."content_posts" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "platform" varchar(30) NOT NULL,
  "status" varchar(30) NOT NULL DEFAULT 'DRAFT',
  "title" varchar(255) NOT NULL,
  "caption" text NOT NULL,
  "hashtags" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "media_url" varchar(1000),
  "scheduled_at" timestamptz(6),
  "published_at" timestamptz(6),
  "external_id" varchar(255),
  "error" text,
  "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "content_posts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_content_posts_platform_status" ON "public"."content_posts"("platform", "status");
CREATE INDEX IF NOT EXISTS "idx_content_posts_scheduled_at" ON "public"."content_posts"("scheduled_at");
CREATE INDEX IF NOT EXISTS "idx_content_posts_created_at" ON "public"."content_posts"("created_at");
