import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClients, OutreachChannel, OutreachStatus } from '@nexor/database';
import { getSessionUser } from '@/lib/auth';
import { sendApprovedOutreach } from '@/lib/outreach-sender';

export const runtime = 'nodejs';
export const maxDuration = 300;

async function authorized(req: NextRequest) {
  const user = await getSessionUser(req);
  return Boolean(user && user.role === 'ADMIN');
}

export async function POST(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const ids = Array.isArray(body?.ids) ? body.ids.filter((x: unknown): x is string => typeof x === 'string') : [];
    if (!ids.length) return NextResponse.json({ success: false, error: 'ids are required' }, { status: 400 });

    const prisma = getDatabaseClients().write;
    const rows = await prisma.outreach.findMany({
      where: { id: { in: ids }, channel: OutreachChannel.WHATSAPP, status: { in: [OutreachStatus.DRAFT, OutreachStatus.APPROVAL_REQUIRED] } },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });
    if (!rows.length) return NextResponse.json({ success: true, approved: 0, sent: 0, failed: 0, results: [], message: 'No WhatsApp items are waiting for approval.' });

    const approvedAt = new Date();
    await prisma.$transaction(rows.map((row) => prisma.outreach.updateMany({
      where: { id: row.id, channel: OutreachChannel.WHATSAPP, status: { in: [OutreachStatus.DRAFT, OutreachStatus.APPROVAL_REQUIRED] } },
      data: { status: OutreachStatus.APPROVED, approvedAt, scheduledAt: approvedAt, error: null },
    })));

    const results: Array<{ id: string; success: boolean; error?: string }> = [];
    let sent = 0;
    let failed = 0;
    const delayMs = Math.max(Number(process.env.WHATSAPP_MIN_DELAY_MS ?? 10000), 10000);

    for (const [index, row] of rows.entries()) {
      if (index > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
      try {
        const result = await sendApprovedOutreach(row.id);
        if (!result.alreadySent) sent += 1;
        results.push({ id: row.id, success: true });
      } catch (error) {
        failed += 1;
        results.push({ id: row.id, success: false, error: error instanceof Error ? error.message : String(error) });
      }
    }

    return NextResponse.json({ success: true, approved: rows.length, sent, failed, results, delayMs });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
