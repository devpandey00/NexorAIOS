import { NextResponse } from 'next/server';
import { getDatabaseClients } from '@nexor/database';
import { executeWorkflow, isSupportedWorkflow } from '@nexor/tools';
import { advanceAutomationSchedule } from '@/lib/automation-schedule';

const db = getDatabaseClients().write;

export async function POST() {
  const claimed = await db.$queryRawUnsafe<Array<{
    id: string;
    schedule_id: string;
    workflow: string;
    input: Record<string, unknown>;
    cron: string | null;
    run_at: Date | null;
    timezone: string | null;
  }>>(
    `WITH due AS (
       SELECT "id","workflow","input","cron","run_at","timezone"
       FROM "public"."automation_schedules"
       WHERE "status"='ACTIVE' AND "next_run_at" IS NOT NULL AND "next_run_at" <= NOW()
       ORDER BY "next_run_at" ASC LIMIT 20
       FOR UPDATE SKIP LOCKED
     ), claimed AS (
       UPDATE "public"."automation_schedules" s
       SET "last_run_at"=NOW(),"run_count"="run_count"+1,"updated_at"=NOW()
       FROM due
       WHERE s."id"=due."id"
       RETURNING s."id",s."workflow",s."input",s."cron",s."run_at",s."timezone"
     )
     INSERT INTO "public"."automation_runs" ("id","schedule_id","status","input","started_at","created_at")
     SELECT gen_random_uuid(),"id",'RUNNING',"input",NOW(),NOW() FROM claimed
     RETURNING "id","schedule_id","input",
       (SELECT "workflow" FROM "public"."automation_schedules" WHERE "id"="schedule_id") AS "workflow",
       (SELECT "cron" FROM "public"."automation_schedules" WHERE "id"="schedule_id") AS "cron",
       (SELECT "run_at" FROM "public"."automation_schedules" WHERE "id"="schedule_id") AS "run_at",
       (SELECT "timezone" FROM "public"."automation_schedules" WHERE "id"="schedule_id") AS "timezone"`,
  );

  const results: Array<Record<string, unknown>> = [];

  for (const run of claimed) {
    try {
      if (!isSupportedWorkflow(run.workflow)) {
        throw new Error(`Unsupported workflow: ${run.workflow}`);
      }

      const execution = await executeWorkflow(run.workflow, run.input ?? {});

      if (!execution.success) {
        throw new Error(`Workflow failed at ${execution.failedStep ?? 'unknown step'}`);
      }

      await db.$executeRawUnsafe(
        `UPDATE "public"."automation_runs"
         SET "status"='COMPLETED',"output"=$1::jsonb,"completed_at"=NOW()
         WHERE "id"=$2::uuid`,
        JSON.stringify(execution),
        run.id,
      );

      await advanceAutomationSchedule(run);

      results.push({ id: run.id, workflow: run.workflow, success: true, execution });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      await db.$executeRawUnsafe(
        `UPDATE "public"."automation_runs"
         SET "status"='FAILED',"error"=$1,"completed_at"=NOW()
         WHERE "id"=$2::uuid`,
        message,
        run.id,
      );

      // Advance even after failure so a broken recurring job cannot hot-loop.
      await advanceAutomationSchedule(run).catch(() => undefined);

      results.push({ id: run.id, workflow: run.workflow, success: false, error: message });
    }
  }

  return NextResponse.json({ success: true, claimed: claimed.length, results });
}
