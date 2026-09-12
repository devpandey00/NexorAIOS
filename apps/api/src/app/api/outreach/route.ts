import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClients, OutreachChannel, OutreachStatus } from '@nexor/database';
import { getSessionUser } from '@/lib/auth';

function getPrisma() { return getDatabaseClients().write; }

const OUTREACH_LIST_STATUSES: OutreachStatus[] = [OutreachStatus.DRAFT, OutreachStatus.APPROVAL_REQUIRED, OutreachStatus.APPROVED, OutreachStatus.SCHEDULED, OutreachStatus.SENT, OutreachStatus.FAILED, OutreachStatus.MANUAL_PENDING];
const APPROVAL_STATUSES: OutreachStatus[] = [OutreachStatus.DRAFT, OutreachStatus.APPROVAL_REQUIRED];
const VALID_CHANNELS = new Set(Object.values(OutreachChannel));

async function authorized(req: NextRequest) {
  const secret = process.env.OUTREACH_API_SECRET?.trim();
  if (secret && req.headers.get('authorization') === `Bearer ${secret}`) return true;
  return Boolean(await getSessionUser(req));
}

export async function GET(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const prisma = getPrisma();
    const drafts = await prisma.outreach.findMany({ where: { status: { in: OUTREACH_LIST_STATUSES } }, include: { lead: true }, orderBy: { createdAt: 'desc' }, take: 200 });
    return NextResponse.json({ success: true, count: drafts.length, drafts });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const prisma = getPrisma();
    const body = await req.json();
    const action = typeof body.action === 'string' ? body.action : '';

    // Composer: create a new DRAFT outreach with a hand-written message for a specific lead.
    // Reuses the exact same Outreach model / status machine / sendApprovedOutreach pipeline
    // that automated outreach already goes through — no separate messaging path.
    if (action === 'create') {
      const leadId = typeof body.leadId === 'string' ? body.leadId.trim() : '';
      const channelRaw = typeof body.channel === 'string' ? body.channel.toUpperCase() : '';
      const message = typeof body.message === 'string' ? body.message.trim() : '';
      const campaignId = typeof body.campaignId === 'string' && body.campaignId.trim() ? body.campaignId.trim() : undefined;
      const mediaUrl = typeof body.mediaUrl === 'string' && body.mediaUrl.trim() ? body.mediaUrl.trim() : undefined;
      const mediaType = typeof body.mediaType === 'string' && body.mediaType.trim() ? body.mediaType.trim() : undefined;

      if (!leadId) return NextResponse.json({ success: false, error: 'leadId is required' }, { status: 400 });
      if (!VALID_CHANNELS.has(channelRaw as OutreachChannel)) return NextResponse.json({ success: false, error: `channel must be one of: ${[...VALID_CHANNELS].join(', ')}` }, { status: 400 });
      if (!message) return NextResponse.json({ success: false, error: 'message is required' }, { status: 400 });

      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead) return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });

      const outreach = await prisma.outreach.create({
        data: { leadId, channel: channelRaw as OutreachChannel, status: OutreachStatus.DRAFT, message, campaignId, mediaUrl, mediaType },
      });
      return NextResponse.json({ success: true, outreach }, { status: 201 });
    }

    const id = typeof body.id === 'string' ? body.id : '';
    if (!id || !['approve', 'reject'].includes(action)) return NextResponse.json({ success: false, error: 'id and action are required' }, { status: 400 });
    const current = await prisma.outreach.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ success: false, error: 'Outreach not found' }, { status: 404 });
    if (!APPROVAL_STATUSES.includes(current.status)) return NextResponse.json({ success: false, error: 'Outreach is not pending approval' }, { status: 409 });
    const outreach = await prisma.outreach.update({
      where: { id },
      data: {
        status: action === 'approve' ? OutreachStatus.APPROVED : OutreachStatus.CANCELLED,
        approvedAt: action === 'approve' ? new Date() : null,
        scheduledAt: action === 'approve' ? new Date(Date.now() + 15000) : null,
      },
    });
    return NextResponse.json({ success: true, outreach });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
