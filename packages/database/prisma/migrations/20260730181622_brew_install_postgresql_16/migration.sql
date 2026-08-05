-- CreateEnum
CREATE TYPE "lead_status" AS ENUM ('NEW', 'RESEARCHED', 'QUALIFIED', 'PITCH_READY', 'CONTACTED', 'REPLIED', 'MEETING_BOOKED', 'PROPOSAL_SENT', 'WON', 'LOST');

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "business_name" VARCHAR(255) NOT NULL,
    "owner_name" VARCHAR(255),
    "niche" VARCHAR(100) NOT NULL,
    "country" VARCHAR(100) NOT NULL,
    "website" VARCHAR(500),
    "email" VARCHAR(255),
    "whatsapp" VARCHAR(30),
    "linkedin" VARCHAR(500),
    "instagram" VARCHAR(500),
    "audit_score" INTEGER,
    "status" "lead_status" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_leads_status" ON "leads"("status");

-- CreateIndex
CREATE INDEX "idx_leads_country" ON "leads"("country");

-- CreateIndex
CREATE INDEX "idx_leads_niche" ON "leads"("niche");

-- CreateIndex
CREATE INDEX "idx_leads_created" ON "leads"("created_at");
