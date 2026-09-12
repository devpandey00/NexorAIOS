-- Add WhatsApp/media attachment support to outreach records.
-- Safe, additive, nullable columns only. No data loss, no destructive change.
ALTER TABLE "public"."outreach"
  ADD COLUMN IF NOT EXISTS "media_url" TEXT,
  ADD COLUMN IF NOT EXISTS "media_type" VARCHAR(20),
  ADD COLUMN IF NOT EXISTS "media_caption" TEXT;

ALTER TABLE "public"."messages"
  ADD COLUMN IF NOT EXISTS "media_url" TEXT,
  ADD COLUMN IF NOT EXISTS "media_type" VARCHAR(20);
