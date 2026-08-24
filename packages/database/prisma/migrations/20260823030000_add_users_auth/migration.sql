-- Compatibility migration retained for history.
-- The preceding authentication migration owns the auth schema. Keep this
-- migration idempotent so environments that already applied either auth
-- migration cannot fail on duplicate enum/table creation.

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
