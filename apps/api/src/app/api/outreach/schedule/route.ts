import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClients, OutreachStatus } from '@nexor/database';
import { getSessionUser } from '@/lib/auth';

function getPrisma() { return getDatabaseClients().write; }

async function authorized(req: NextRequest) {
  const secret = process.env.OUTREACH_API_SECRET?.trim();
  if (secret && req.headers.get('authorization') === `Bearer ${secret}`) return true;
  return Boolean(await getSessionUser(req));
}

export async function POST(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const prisma = getPrisma();
    const body = await req.json();
    const id = typeof body?.id === 'string' ? body.id.trim() : '';
    const scheduledAt = typeof body?.scheduledAt === 'string' ? new Date(body.scheduledAt) : new Date();
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    if (Number.isNaN(scheduledAt.getTime())) return NextResponse.json({ success: false, error: 'scheduledAt must be a valid ISO timestamp' }, { status: 400 });
    if (scheduledAt.getTime() < Date.now()) return NextResponse.json({ success: false, error: 'scheduledAt must be in the future' }, { status: 400 });
    const claimed = await prisma.outreach.updateMany({
      where: { id, status: OutreachStatus.APPROVED },
      data: { status: OutreachStatus.SCHEDULED, scheduledAt, error: null },
    });
    if (claimed.count !== 1) {
      const outreach = await prisma.outreach.findUnique({ where: { id } });
      if (!outreach) return NextResponse.json({ success: false, error: 'Outreach not found' }, { status: 404 });
      return NextResponse.json({ success: false, error: `Outreach cannot be scheduled from ${outreach.status}` }, { status: 409 });
    }
    const updated = await prisma.outreach.findUnique({ where: { id } });
    return NextResponse.json({ success: true, outreach: updated });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
