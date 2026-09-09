import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClients, OutreachChannel, OutreachStatus } from '@nexor/database';
import { isAutomationEnabled, isOutboundEnabled } from '@/lib/automation-settings';
import { authorizeMachineRequest } from '@/lib/machine-auth';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  if (!(await authorizeMachineRequest(req))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  if (!(await isAutomationEnabled('outreach'))) return NextResponse.json({ success: true, skipped: true, reason: 'AUTOMATION_DISABLED', capability: 'outreach' });
  if (!(await isOutboundEnabled())) return NextResponse.json({ success: true, skipped: true, reason: 'OUTBOUND_PAUSED' });

  try {
    const db = getDatabaseClients().write;
    const limit = Math.min(Math.max(Number(process.env.OUTREACH_AUTO_APPROVE_PER_RUN ?? 20), 1), 50);
    const candidates = await db.outreach.findMany({
      where: {
        channel: OutreachChannel.EMAIL,
        status: OutreachStatus.APPROVAL_REQUIRED,
        lead: { email: { not: null } },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: { id: true },
    });

    let approved = 0;
    for (const item of candidates) {
      const result = await db.outreach.updateMany({
        where: { id: item.id, channel: OutreachChannel.EMAIL, status: OutreachStatus.APPROVAL_REQUIRED },
        data: { status: OutreachStatus.APPROVED, approvedAt: new Date(), error: null },
      });
      approved += result.count;
    }

    return NextResponse.json({ success: true, candidates: candidates.length, approved, note: 'Only AI-generated email outreach is auto-approved. WhatsApp/social channels remain gated by their provider/compliance requirements.' });
  } catch (error) {
    console.error('[OUTREACH AUTO-APPROVE ERROR]', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
