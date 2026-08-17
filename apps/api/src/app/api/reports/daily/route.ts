import { NextResponse } from 'next/server';
import { getDatabaseClients } from '@nexor/database';

const db = getDatabaseClients().write;

export async function GET() {
  try {
    const [leads, outreach, jobs, runs, followUps] = await Promise.all([
      db.$queryRawUnsafe<Array<{ status: string; count: bigint }>>(
        `SELECT "status"::text, COUNT(*)::bigint AS "count" FROM "public"."leads" WHERE "created_at" >= CURRENT_DATE GROUP BY "status"`,
      ),
      db.$queryRawUnsafe<Array<{ status: string; count: bigint }>>(
        `SELECT "status"::text, COUNT(*)::bigint AS "count" FROM "public"."outreach" WHERE "created_at" >= CURRENT_DATE GROUP BY "status"`,
      ),
      db.$queryRawUnsafe<Array<{ status: string; count: bigint }>>(
        `SELECT "status"::text, COUNT(*)::bigint AS "count" FROM "public"."jobs" WHERE "created_at" >= CURRENT_DATE GROUP BY "status"`,
      ),
      db.$queryRawUnsafe<Array<{ status: string; count: bigint }>>(
        `SELECT "status"::text, COUNT(*)::bigint AS "count" FROM "public"."automation_runs" WHERE "created_at" >= CURRENT_DATE GROUP BY "status"`,
      ),
      db.$queryRawUnsafe<Array<{ status: string; count: bigint }>>(
        `SELECT "status"::text, COUNT(*)::bigint AS "count" FROM "public"."follow_ups" WHERE "created_at" >= CURRENT_DATE GROUP BY "status"`,
      ),
    ]);

    const normalize = (rows: Array<{ status: string; count: bigint }>) =>
      Object.fromEntries(rows.map((row) => [row.status, Number(row.count)]));

    const report = {
      date: new Date().toISOString().slice(0, 10),
      leads: normalize(leads),
      outreach: normalize(outreach),
      jobs: normalize(jobs),
      automationRuns: normalize(runs),
      followUps: normalize(followUps),
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, report });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
