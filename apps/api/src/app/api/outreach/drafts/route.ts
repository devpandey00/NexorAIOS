import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClients, LeadStatus, OutreachChannel, OutreachStatus } from '@nexor/database';
import { outreachService } from '@nexor/ai';
import { validateBusinessLead } from '@/lib/validators/lead';

const prisma = getDatabaseClients().write;

function normalizeChannel(value: unknown): OutreachChannel | null {
  if (typeof value !== 'string') return null;
  return Object.values(OutreachChannel).includes(value as OutreachChannel) ? value as OutreachChannel : null;
}

function authorized(req: NextRequest) {
  const secret = process.env.OUTREACH_API_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  return req.headers.get('authorization') === `Bearer ${secret}` || req.headers.get('x-outreach-secret') === secret;
}

function buildMessage(channel: OutreachChannel, lead: { businessName: string | null; ownerName: string | null }, context: string) {
  const greeting = lead.ownerName ? `Hi ${lead.ownerName},` : `Hi ${lead.businessName || 'there'},`;
  if (channel === OutreachChannel.EMAIL) return `${greeting}\n\nI came across ${lead.businessName || 'your business'} and noticed a few opportunities to improve its digital acquisition. ${context}\n\nIf useful, I can share a short audit with the highest-impact opportunities.\n\nRegards,\nNexor`;
  return `${greeting} ${context} I can share a short, practical audit if useful.`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const leadId = req.nextUrl.searchParams.get('leadId');
  const channel = normalizeChannel(req.nextUrl.searchParams.get('channel'));
  if (!leadId) return NextResponse.json({ success: false, error: 'leadId is required' }, { status: 400 });
  const where = { leadId, ...(channel ? { channel } : {}) };
  const drafts = await prisma.outreach.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 });
  return NextResponse.json({ success: true, drafts });
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const leadId = typeof body.leadId === 'string' ? body.leadId : '';
    const channel = normalizeChannel(body.channel);
    const context = typeof body.context === 'string' ? body.context.trim() : '';
    const supported: OutreachChannel[] = [
      OutreachChannel.WHATSAPP,
      OutreachChannel.EMAIL,
      OutreachChannel.INSTAGRAM,
      OutreachChannel.FACEBOOK,
      OutreachChannel.LINKEDIN,
    ];
    if (!leadId || !channel || !supported.includes(channel)) return NextResponse.json({ success: false, error: 'leadId and a supported outreach channel are required' }, { status: 400 });

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });

    const validation = validateBusinessLead(lead);
    if (!validation.ok) return NextResponse.json({ success: false, error: validation.reason }, { status: 422 });
    if (channel === OutreachChannel.WHATSAPP && !lead.whatsapp) return NextResponse.json({ success: false, error: 'NOT CONTACTABLE: WhatsApp number missing' }, { status: 422 });

    const existing = await prisma.outreach.findFirst({ where: { leadId, channel, status: { in: [OutreachStatus.DRAFT, OutreachStatus.APPROVAL_REQUIRED, OutreachStatus.APPROVED, OutreachStatus.SCHEDULED] } }, orderBy: { createdAt: 'desc' } });
    if (existing) return NextResponse.json({ success: true, duplicate: true, outreach: existing });

    let message = '';
    if (channel === OutreachChannel.WHATSAPP) {
      const parsed = validation.parsed ?? {};
      const research = parsed.research ?? {};
      const score = parsed.score ?? {};
      const generated = await outreachService.generate({
        businessName: lead.businessName,
        ownerName: lead.ownerName,
        niche: lead.niche,
        country: lead.country,
        website: lead.website,
        whatsapp: lead.whatsapp,
        auditScore: lead.auditScore,
        notes: lead.notes,
        verifiedResearch: research,
        verifiedScore: score,
        leadMetadata: { leadType: validation.leadType, source: validation.source },
        uniquenessInstruction: `Create a unique first-contact WhatsApp message for ${lead.businessName}. Use one or two specific verified findings from this lead only. ${context}`,
      });
      message = typeof generated?.whatsapp === 'string' ? generated.whatsapp.trim() : '';
      if (!message) return NextResponse.json({ success: false, error: 'AI could not produce a personalized WhatsApp draft' }, { status: 502 });
    } else {
      message = buildMessage(channel, lead, context || 'Your current digital presence looks like it has room for measurable improvements.');
    }

    const outreach = await prisma.$transaction(async (tx) => {
      const created = await tx.outreach.create({ data: { leadId, channel, status: OutreachStatus.APPROVAL_REQUIRED, message } });
      await tx.lead.update({ where: { id: leadId }, data: { status: LeadStatus.PITCH_READY } });
      return created;
    });

    return NextResponse.json({ success: true, outreach }, { status: 201 });
  } catch (error) {
    console.error('[OUTREACH DRAFT ERROR]', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
