import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getDatabaseClients } from '@nexor/database';
import { getSessionUser } from '@/lib/auth';

function getDb() {
  return getDatabaseClients().write;
}

function authorizedBySecret(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const supplied = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || req.headers.get('x-cron-secret') || '';
  return supplied === secret;
}

async function authorized(req: NextRequest) {
  if (authorizedBySecret(req)) return true;
  return Boolean(await getSessionUser(req));
}

const SUPPORTED_WORKFLOWS = new Set([
  'lead_generation',
  'lead_to_outreach',
  'sales_machine',
  'social_content',
  'opportunity_discovery',
  'crm',
  'research',
  'website_audit',
  'whatsapp',
  'email',
  'proposal',
]);

function validateCronExpression(expression: string) {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) return 'Cron expression must contain exactly 5 fields';
  const ranges = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 7]] as const;
  for (let index = 0; index < fields.length; index += 1) {
    for (const token of fields[index].split(',')) {
      const [rangePart, stepPart] = token.split('/');
      if (stepPart !== undefined && (!/^\d+$/.test(stepPart) || Number(stepPart) < 1)) {
        return `Invalid cron step: ${token}`;
      }
      if (rangePart === '*') continue;
      const [startRaw, endRaw] = rangePart.split('-');
      if (!/^\d+$/.test(startRaw) || (endRaw !== undefined && !/^\d+$/.test(endRaw))) {
        return `Invalid cron field: ${token}`;
      }
      const start = Number(startRaw);
      const end = endRaw === undefined ? start : Number(endRaw);
      const [min, max] = ranges[index];
      if (start < min || end > max || start > end) return `Invalid cron field: ${token}`;
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const db = getDb();
    const schedules = await db.$queryRawUnsafe<unknown[]>(
      `SELECT * FROM "public"."automation_schedules" ORDER BY "next_run_at" ASC NULLS LAST, "created_at" DESC LIMIT 200`,
    );
    return NextResponse.json({ success: true, schedules });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const db = getDb();
    const body = await req.json();
    if (typeof body.name !== 'string' || !body.name.trim() || typeof body.workflow !== 'string') {
      return NextResponse.json({ success: false, error: 'name and workflow are required' }, { status: 400 });
    }
    if (!SUPPORTED_WORKFLOWS.has(body.workflow)) {
      return NextResponse.json({ success: false, error: `Unsupported workflow: ${body.workflow}` }, { status: 400 });
    }

    const input = body.input && typeof body.input === 'object' ? body.input : {};
    const id = randomUUID();
    const runAt = typeof body.runAt === 'string' ? new Date(body.runAt) : null;
    const cron = typeof body.cron === 'string' && body.cron.trim() ? body.cron.trim() : null;
    if (!runAt && !cron) {
      return NextResponse.json({ success: false, error: 'Provide runAt for a one-time schedule or cron for a recurring schedule' }, { status: 400 });
    }
    if (runAt && Number.isNaN(runAt.getTime())) {
      return NextResponse.json({ success: false, error: 'runAt must be a valid ISO date' }, { status: 400 });
    }
    if (cron) {
      const cronError = validateCronExpression(cron);
      if (cronError) return NextResponse.json({ success: false, error: cronError }, { status: 400 });
      if (!runAt) {
        return NextResponse.json({ success: false, error: 'Recurring schedules require an initial runAt timestamp; the worker calculates subsequent runs from cron' }, { status: 400 });
      }
    }

    const timezone = typeof body.timezone === 'string' && body.timezone.trim() ? body.timezone.trim() : 'UTC';
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
    } catch {
      return NextResponse.json({ success: false, error: `Invalid timezone: ${timezone}` }, { status: 400 });
    }

    const rows = await db.$queryRawUnsafe<unknown[]>(
      `INSERT INTO "public"."automation_schedules"
       ("id","name","workflow","input","cron","run_at","timezone","status","next_run_at","created_at","updated_at")
       VALUES ($1::uuid,$2,$3,$4::jsonb,$5,$6,$7,'ACTIVE',$6,NOW(),NOW()) RETURNING *`,
      id,
      body.name.trim(),
      body.workflow,
      JSON.stringify(input),
      cron,
      runAt,
      timezone,
    );
    return NextResponse.json({ success: true, schedule: rows[0] }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
