import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getDatabaseClients } from '@nexor/database';

function getDb() {
  return getDatabaseClients().write;
}

export async function GET() {
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
  try {
    const db = getDb();
    const body = await req.json();
    if (typeof body.name !== 'string' || typeof body.workflow !== 'string') {
      return NextResponse.json({ success: false, error: 'name and workflow are required' }, { status: 400 });
    }
    const input = body.input && typeof body.input === 'object' ? body.input : {};
    const id = randomUUID();
    const runAt = typeof body.runAt === 'string' ? new Date(body.runAt) : null;
    if (runAt && Number.isNaN(runAt.getTime())) {
      return NextResponse.json({ success: false, error: 'runAt must be a valid ISO date' }, { status: 400 });
    }
    const rows = await db.$queryRawUnsafe<unknown[]>(
      `INSERT INTO "public"."automation_schedules"
       ("id","name","workflow","input","cron","run_at","timezone","status","next_run_at","created_at","updated_at")
       VALUES ($1::uuid,$2,$3,$4::jsonb,$5,$6,$7,'ACTIVE',$6,NOW(),NOW()) RETURNING *`,
      id,
      body.name,
      body.workflow,
      JSON.stringify(input),
      typeof body.cron === 'string' ? body.cron : null,
      runAt,
      typeof body.timezone === 'string' ? body.timezone : 'UTC',
    );
    return NextResponse.json({ success: true, schedule: rows[0] }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
