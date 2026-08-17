CREATE TYPE "public"."automation_schedule_status" AS ENUM ('ACTIVE','PAUSED','FAILED','CANCELLED');
CREATE TYPE "public"."memory_kind" AS ENUM ('FACT','PREFERENCE','DECISION','CONTEXT','OUTCOME');

CREATE TABLE "public"."automation_schedules" (
  "id" UUID NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "workflow" VARCHAR(100) NOT NULL,
  "input" JSONB NOT NULL,
  "cron" VARCHAR(100),
  "run_at" TIMESTAMPTZ(6),
  "timezone" VARCHAR(64) NOT NULL DEFAULT 'UTC',
  "status" "public"."automation_schedule_status" NOT NULL DEFAULT 'ACTIVE',
  "last_run_at" TIMESTAMPTZ(6),
  "next_run_at" TIMESTAMPTZ(6),
  "last_error" TEXT,
  "run_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "automation_schedules_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "idx_automation_schedules_due" ON "public"."automation_schedules"("status","next_run_at");
CREATE INDEX "idx_automation_schedules_workflow" ON "public"."automation_schedules"("workflow","status");

CREATE TABLE "public"."automation_runs" (
  "id" UUID NOT NULL,
  "schedule_id" UUID NOT NULL,
  "status" "public"."job_status" NOT NULL DEFAULT 'QUEUED',
  "input" JSONB NOT NULL,
  "output" JSONB,
  "error" TEXT,
  "started_at" TIMESTAMPTZ(6),
  "completed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "automation_runs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "idx_automation_runs_schedule_created" ON "public"."automation_runs"("schedule_id","created_at");
CREATE INDEX "idx_automation_runs_status_created" ON "public"."automation_runs"("status","created_at");
ALTER TABLE "public"."automation_runs" ADD CONSTRAINT "automation_runs_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "public"."automation_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "public"."memory_items" (
  "id" UUID NOT NULL,
  "key" VARCHAR(255) NOT NULL,
  "kind" "public"."memory_kind" NOT NULL,
  "value" JSONB NOT NULL,
  "source" VARCHAR(100),
  "confidence" INTEGER NOT NULL DEFAULT 100,
  "last_used_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "memory_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "memory_items_key_kind_key" UNIQUE ("key","kind")
);
CREATE INDEX "idx_memory_items_kind_updated" ON "public"."memory_items"("kind","updated_at");
