import { NextResponse } from 'next/server';
import { getDatabaseClients, OutreachStatus } from '@nexor/database';

export const runtime = 'nodejs';
const db = getDatabaseClients().write;

export async function GET() {
  try {
    const [leads, drafts, scheduled, sent, followups] = await Promise.all([
      db.lead.findMany({ orderBy: { updatedAt: 'desc' }, take: 50, select: { id: true, businessName: true, website: true, email: true, whatsapp: true, auditScore: true, status: true, notes: true, updatedAt: true } }),
      db.outreach.count({ where: { status: OutreachStatus.DRAFT } }),
      db.outreach.count({ where: { status: OutreachStatus.SCHEDULED } }),
      db.outreach.count({ where: { status: OutreachStatus.SENT } }),
      db.followUp.count({ where: { status: { in: ['PENDING', 'SCHEDULED'] } } }),
    ]);
    return NextResponse.json({ success: true, leads, stats: { leads: leads.length, drafts, scheduled, sent, followups } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
