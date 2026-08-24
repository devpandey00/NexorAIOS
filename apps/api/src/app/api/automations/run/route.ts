import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClients } from '@nexor/database';
import { executeWorkflow, type SupportedWorkflow } from '@nexor/tools';

export const runtime = 'nodejs';
export const maxDuration = 300;

const db = getDatabaseClients().write;

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.AUTOMATION_API_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  const supplied = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || req.headers.get('x-cron-secret') || '';
  return supplied === secret;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const claimed = await db.$queryRawUnsafe<Array<{ id: string; schedule_id: string; workflow: string; input: Record<string, unknown> }>>(
    `WITH due AS (
       SELECT "id","workflow","input" FROM "public"."automation_schedules"
       WHERE "status"='ACTIVE' AND "next_run_at" IS NOT NULL AND "next_run_at" <= NOW()
       ORDER BY "next_run_at" ASC LIMIT 20
       FOR UPDATE SKIP LOCKED
     ), claimed AS (
       UPDATE "public"."automation_schedules" s
       SET "last_run_at"=NOW(),"run_count"="run_count"+1,"updated_at"=NOW()
       FROM due WHERE s."id"=due."id"
       RETURNING s."id",s."workflow",s."input"
     )
     INSERT INTO "public"."automation_runs" ("id","schedule_id","status","input","started_at","created_at")
     SELECT gen_random_uuid(),"id",'RUNNING',"input",NOW(),NOW() FROM claimed
     RETURNING "id","schedule_id","input",(SELECT "workflow" FROM "public"."automation_schedules" WHERE "id"="schedule_id") AS "workflow"`,
  );

  const results: Array<Record<string, unknown>> = [];
  for (const run of claimed) {
    try {
      const execution = await executeWorkflow(run.workflow as SupportedWorkflow, run.input ?? {});
      if (!execution.success) throw new Error(`Workflow failed at ${execution.failedStep ?? 'unknown step'}`);
      await db.$executeRawUnsafe(
        `UPDATE "public"."automation_runs" SET "status"='COMPLETED',"output"=$1::jsonb,"completed_at"=NOW() WHERE "id"=$2::uuid`,
        JSON.stringify(execution), run.id,
      );
      await db.$executeRawUnsafe(
        `UPDATE "public"."automation_schedules"
         SET "status"=CASE WHEN "cron" IS NULL THEN 'CANCELLED'::"public"."automation_schedule_status" ELSE "status" END,
             "next_run_at"=CASE WHEN "cron" IS NULL THEN NULL ELSE "next_run_at" END,
             "last_error"=NULL,
             "updated_at"=NOW()
         WHERE "id"=$1::uuid`,
        run.schedule_id,
      );
      results.push({ id: run.id, workflow: run.workflow, success: true, execution });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await db.$executeRawUnsafe(
        `UPDATE "public"."automation_runs" SET "status"='FAILED',"error"=$1,"completed_at"=NOW() WHERE "id"=$2::uuid`,
        message, run.id,
      );
      await db.$executeRawUnsafe(
        `UPDATE "public"."automation_schedules" SET "status"='FAILED',"last_error"=$1,"updated_at"=NOW() WHERE "id"=$2::uuid`,
        message, run.schedule_id,
      );
      results.push({ id: run.id, workflow: run.workflow, success: false, error: message });
    }
  }

  return NextResponse.json({ success: true, claimed: claimed.length, results });
}
