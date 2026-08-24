-- NexorAIOS authentication foundation
-- Idempotent production-safe migration. This migration may be encountered after
-- a manual/bootstrap repair, so every DDL operation is guarded.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'user_role'
      AND typnamespace = 'public'::regnamespace
  ) THEN
    CREATE TYPE "public"."user_role" AS ENUM ('ADMIN', 'USER');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "public"."users" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" VARCHAR(320) NOT NULL,
  "password_hash" TEXT NOT NULL,
  "role" "public"."user_role" NOT NULL DEFAULT 'USER',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "public"."users"("email");
CREATE INDEX IF NOT EXISTS "idx_users_role" ON "public"."users"("role");

CREATE OR REPLACE FUNCTION "public"."set_users_updated_at"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."updated_at" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "users_updated_at" ON "public"."users";
CREATE TRIGGER "users_updated_at"
BEFORE UPDATE ON "public"."users"
FOR EACH ROW
EXECUTE FUNCTION "public"."set_users_updated_at"();
