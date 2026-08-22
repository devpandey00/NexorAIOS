import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClients } from '@nexor/database';
import { randomUUID } from 'node:crypto';

function getDb() { return getDatabaseClients().write; }
const KINDS = new Set(['FACT', 'PREFERENCE', 'DECISION', 'CONTEXT', 'OUTCOME']);

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const kind = req.nextUrl.searchParams.get('kind');
    const limit = Math.max(1, Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 20) || 20, 100));
    const rows = kind && KINDS.has(kind)
      ? await db.$queryRawUnsafe<unknown[]>(`SELECT * FROM "public"."memory_items" WHERE "kind" = $1 ORDER BY "confidence" DESC, "updated_at" DESC LIMIT $2`, kind, limit)
      : await db.$queryRawUnsafe<unknown[]>(`SELECT * FROM "public"."memory_items" ORDER BY "confidence" DESC, "updated_at" DESC LIMIT $1`, limit);
    return NextResponse.json({ success: true, memories: rows });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    if (typeof body.key !== 'string' || typeof body.kind !== 'string' || !KINDS.has(body.kind)) {
      return NextResponse.json({ success: false, error: 'key and valid kind are required' }, { status: 400 });
    }
    const confidence = Math.max(0, Math.min(100, Number(body.confidence ?? 100)));
    const rows = await db.$queryRawUnsafe<unknown[]>(
      `INSERT INTO "public"."memory_items" ("id","key","kind","value","source","confidence","created_at","updated_at")
       VALUES ($1::uuid,$2,$3,$4::jsonb,$5,$6,NOW(),NOW())
       ON CONFLICT ("key","kind") DO UPDATE SET "value"=EXCLUDED."value","source"=EXCLUDED."source","confidence"=EXCLUDED."confidence","updated_at"=NOW()
       RETURNING *`,
      randomUUID(), body.key, body.kind, JSON.stringify(body.value ?? null), typeof body.source === 'string' ? body.source : null, confidence,
    );
    return NextResponse.json({ success: true, memory: rows[0] }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
