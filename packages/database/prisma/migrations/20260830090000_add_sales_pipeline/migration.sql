CREATE TYPE "meeting_status" AS ENUM ('OFFERED','SCHEDULED','BOOKED','CANCELLED','COMPLETED','NO_SHOW');
CREATE TYPE "opportunity_stage" AS ENUM ('OPEN','QUALIFIED','PROPOSAL','WON','LOST');
CREATE TYPE "proposal_status" AS ENUM ('DRAFT','SENT','ACCEPTED','REJECTED','EXPIRED');

ALTER TABLE "activity_events" ADD COLUMN "lead_id" UUID;
CREATE INDEX "idx_activity_lead_created" ON "activity_events"("lead_id","created_at");
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "meetings" (
  "id" UUID NOT NULL,
  "lead_id" UUID NOT NULL,
  "opportunity_id" UUID,
  "title" VARCHAR(255) NOT NULL,
  "status" "meeting_status" NOT NULL DEFAULT 'OFFERED',
  "scheduled_at" TIMESTAMPTZ(6),
  "duration_minutes" INTEGER NOT NULL DEFAULT 30,
  "meeting_url" VARCHAR(1000),
  "provider" VARCHAR(100),
  "provider_event_id" VARCHAR(255),
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "meetings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "meetings_provider_event_id_key" UNIQUE ("provider_event_id"),
  CONSTRAINT "meetings_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "idx_meetings_lead_status" ON "meetings"("lead_id","status");
CREATE INDEX "idx_meetings_scheduled" ON "meetings"("scheduled_at");

CREATE TABLE "opportunities" (
  "id" UUID NOT NULL,
  "lead_id" UUID NOT NULL,
  "campaign_id" UUID,
  "name" VARCHAR(255) NOT NULL,
  "stage" "opportunity_stage" NOT NULL DEFAULT 'OPEN',
  "value" DECIMAL(12,2),
  "currency" VARCHAR(10),
  "owner" VARCHAR(255),
  "loss_reason" TEXT,
  "won_at" TIMESTAMPTZ(6),
  "lost_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "opportunities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "opportunities_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "idx_opportunities_lead_stage" ON "opportunities"("lead_id","stage");
CREATE INDEX "idx_opportunities_campaign" ON "opportunities"("campaign_id");

ALTER TABLE "meetings" ADD CONSTRAINT "meetings_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "proposals" (
  "id" UUID NOT NULL,
  "opportunity_id" UUID NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "scope" TEXT NOT NULL,
  "content" TEXT,
  "value" DECIMAL(12,2),
  "currency" VARCHAR(10),
  "status" "proposal_status" NOT NULL DEFAULT 'DRAFT',
  "sent_at" TIMESTAMPTZ(6),
  "provider_message_id" VARCHAR(255),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "proposals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "proposals_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "idx_proposals_opportunity_status" ON "proposals"("opportunity_id","status");
