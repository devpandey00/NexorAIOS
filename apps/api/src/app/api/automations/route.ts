import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getDatabaseClients } from '@nexor/database';

const db = getDatabaseClients().write;

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.AUTOMATION_API_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  const supplied = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || req.headers.get('x-cron-secret') || '';
  return supplied === secret;
}

const SUPPORTED_WORKFLOWS = new Set([
  'lead_generation',
  'lead_to_outreach',
  'social_content',
  'opportunity_discovery',
  'crm',
  'research',
  'website_audit',
  'whatsapp',
  'email',
  'proposal',
]);

export async function GET() {
  try {
    const schedules = await db.$queryRawUnsafe<unknown[]>(
      `SELECT * FROM "public"."automation_schedules" ORDER BY "next_run_at" ASC NULLS LAST, "created_at" DESC LIMIT 200`,
    );
    return NextResponse.json({ success: true, schedules });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
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
    if (cron && !runAt) {
      return NextResponse.json({ success: false, error: 'Recurring schedules require an initial runAt timestamp; the worker calculates subsequent runs from cron' }, { status: 400 });
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
