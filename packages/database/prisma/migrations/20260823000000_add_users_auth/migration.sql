-- NexorAIOS authentication foundation
-- Safe additive migration: creates the auth user table and role enum.

CREATE TYPE "public"."user_role" AS ENUM ('ADMIN', 'USER');

CREATE TABLE "public"."users" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "email" VARCHAR(320) NOT NULL,
  "password_hash" TEXT NOT NULL,
  "role" "public"."user_role" NOT NULL DEFAULT 'USER',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");
CREATE INDEX "idx_users_role" ON "public"."users"("role");

-- Keep updated_at correct for direct SQL updates as well as application writes.
CREATE OR REPLACE FUNCTION "public"."set_users_updated_at"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."updated_at" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "users_updated_at"
BEFORE UPDATE ON "public"."users"
FOR EACH ROW
EXECUTE FUNCTION "public"."set_users_updated_at"();
