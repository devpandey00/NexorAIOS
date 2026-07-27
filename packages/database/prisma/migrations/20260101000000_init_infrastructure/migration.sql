-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "infra";

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "citext";

-- CreateEnum
CREATE TYPE "infra"."outbox_event_status" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "infra"."seed_executions" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "executed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration_ms" INTEGER NOT NULL,
    "checksum" VARCHAR(64),
    "metadata" JSONB,

    CONSTRAINT "seed_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "infra"."outbox_events" (
    "id" UUID NOT NULL,
    "event_type" VARCHAR(255) NOT NULL,
    "event_version" INTEGER NOT NULL DEFAULT 1,
    "aggregate_id" UUID NOT NULL,
    "aggregate_type" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "metadata" JSONB NOT NULL,
    "status" "infra"."outbox_event_status" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "organization_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seed_executions_name_key" ON "infra"."seed_executions"("name");

-- CreateIndex
CREATE INDEX "idx_outbox_events_status_created" ON "infra"."outbox_events"("status", "created_at");

-- CreateIndex
CREATE INDEX "idx_outbox_events_aggregate" ON "infra"."outbox_events"("aggregate_type", "aggregate_id");

-- CreateIndex
CREATE INDEX "idx_outbox_events_organization" ON "infra"."outbox_events"("organization_id");
