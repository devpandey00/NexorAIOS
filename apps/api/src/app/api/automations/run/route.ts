import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClients } from '@nexor/database';
import { executeWorkflow, type SupportedWorkflow } from '@nexor/tools';

export const runtime = 'nodejs';
export const maxDuration = 300;

const db = getDatabaseClients().write;
const MINUTE_MS = 60_000;
const MAX_CRON_LOOKAHEAD_MINUTES = 366 * 24 * 60;

type CronSpec = {
  minute: Set<number>;
  hour: Set<number>;
  dayOfMonth: Set<number>;
  month: Set<number>;
  dayOfWeek: Set<number>;
  dayOfMonthWildcard: boolean;
  dayOfWeekWildcard: boolean;
};

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.AUTOMATION_API_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  const supplied = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || req.headers.get('x-cron-secret') || '';
  return supplied === secret;
}

function parseField(raw: string, min: number, max: number): Set<number> {
  const values = new Set<number>();
  for (const token of raw.split(',')) {
    const [rangePart, stepPart] = token.split('/');
    const step = stepPart ? Number(stepPart) : 1;
    if (!Number.isInteger(step) || step < 1) throw new Error(`Invalid cron step: ${token}`);
    let start = min;
    let end = max;
    if (rangePart !== '*') {
      const range = rangePart.split('-');
      start = Number(range[0]);
      end = range.length === 2 ? Number(range[1]) : start;
    }
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < min || end > max || start > end) {
      throw new Error(`Invalid cron field: ${token}`);
    }
    for (let value = start; value <= end; value += step) values.add(value);
  }
  if (!values.size) throw new Error(`Empty cron field: ${raw}`);
  return values;
}

function parseCron(expression: string): CronSpec {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) throw new Error('Cron expression must contain exactly 5 fields');
  return {
    minute: parseField(fields[0], 0, 59),
    hour: parseField(fields[1], 0, 23),
    dayOfMonth: parseField(fields[2], 1, 31),
    month: parseField(fields[3], 1, 12),
    dayOfWeek: parseField(fields[4], 0, 7),
    dayOfMonthWildcard: fields[2] === '*',
    dayOfWeekWildcard: fields[4] === '*',
  };
}

function matchesCron(spec: CronSpec, parts: { minute: number; hour: number; day: number; month: number; weekday: number }) {
  if (!spec.minute.has(parts.minute) || !spec.hour.has(parts.hour) || !spec.month.has(parts.month)) return false;
  const domMatch = spec.dayOfMonth.has(parts.day);
  const dowMatch = spec.dayOfWeek.has(parts.weekday) || (parts.weekday === 0 && spec.dayOfWeek.has(7));
  if (spec.dayOfMonthWildcard && spec.dayOfWeekWildcard) return true;
  if (spec.dayOfMonthWildcard) return dowMatch;
  if (spec.dayOfWeekWildcard) return domMatch;
  return domMatch || dowMatch;
}

function nextCronRun(expression: string, from: Date, timezone: string) {
  const spec = parseCron(expression);
  const formatter = timezone === 'UTC'
    ? null
    : new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        calendar: 'gregory',
        hourCycle: 'h23',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        weekday: 'short',
      });
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const start = Math.floor(from.getTime() / MINUTE_MS) * MINUTE_MS + MINUTE_MS;

  for (let offset = 0; offset <= MAX_CRON_LOOKAHEAD_MINUTES; offset += 1) {
    const candidate = new Date(start + offset * MINUTE_MS);
    let parts: { minute: number; hour: number; day: number; month: number; weekday: number };
    if (!formatter) {
      parts = {
        minute: candidate.getUTCMinutes(),
        hour: candidate.getUTCHours(),
        day: candidate.getUTCDate(),
        month: candidate.getUTCMonth() + 1,
        weekday: candidate.getUTCDay(),
      };
    } else {
      const values = Object.fromEntries(formatter.formatToParts(candidate).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
      parts = {
        minute: Number(values.minute),
        hour: Number(values.hour),
        day: Number(values.day),
        month: Number(values.month),
        weekday: weekdayMap[values.weekday] ?? -1,
      };
    }
    if (matchesCron(spec, parts)) return candidate;
  }
  throw new Error(`Cron expression has no occurrence within ${MAX_CRON_LOOKAHEAD_MINUTES} minutes`);
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

      const schedule = await db.$queryRawUnsafe<Array<{ cron: string | null; timezone: string }>>(
        `SELECT "cron","timezone" FROM "public"."automation_schedules" WHERE "id"=$1::uuid LIMIT 1`,
        run.schedule_id,
      );
      const currentSchedule = schedule[0];
      const nextRun = currentSchedule?.cron
        ? nextCronRun(currentSchedule.cron, new Date(), currentSchedule.timezone || 'UTC')
        : null;

      await db.$executeRawUnsafe(
        `UPDATE "public"."automation_runs" SET "status"='COMPLETED',"output"=$1::jsonb,"completed_at"=NOW() WHERE "id"=$2::uuid`,
        JSON.stringify(execution), run.id,
      );
      await db.$executeRawUnsafe(
        `UPDATE "public"."automation_schedules"
         SET "status"=CASE WHEN "cron" IS NULL THEN 'CANCELLED'::"public"."automation_schedule_status" ELSE 'ACTIVE'::"public"."automation_schedule_status" END,
             "next_run_at"=$1,
             "last_error"=NULL,
             "updated_at"=NOW()
         WHERE "id"=$2::uuid`,
        nextRun,
        run.schedule_id,
      );
      results.push({ id: run.id, workflow: run.workflow, success: true, nextRunAt: nextRun, execution });
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
