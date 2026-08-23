import {
  ConversationChannel,
  FollowUpStatus,
  getDatabaseClients,
  LeadStatus,
  MessageDirection,
  OutreachChannel,
  OutreachStatus,
} from '@nexor/database';

function getPrisma() {
  return getDatabaseClients().write;
}

const BLOCKED_NAME_PATTERNS = [/\bjobs?\b/i, /\bvacanc(?:y|ies)\b/i, /\bcareers?\b/i, /\bhiring\b/i, /\bsalary\b/i, /\bapply now\b/i, /\bresume\b/i, /\bcv\b/i, /\binternship\b/i, /\btop\b/i, /\bbest\b/i, /\blist\b/i, /\bdirectory\b/i, /\bguide\b/i, /\barticle\b/i, /\bnews\b/i];
const BLOCKED_SOURCES = new Set(['JOB', 'JOB_SEARCH', 'JOB-SEARCH', 'RECRUITMENT', 'CAREER', 'JOB_PORTAL']);
const VALID_LEAD_TYPES = new Set(['BUSINESS', 'COMPANY', 'LOCAL_BUSINESS', 'AGENCY', 'PROFESSIONAL_SERVICE']);

function leadIsSendable(lead: { businessName: string; whatsapp: string | null; notes: string | null }) {
  if (!lead.whatsapp) return { ok: false, reason: 'NOT CONTACTABLE: WhatsApp number missing' };
  if (BLOCKED_NAME_PATTERNS.some((pattern) => pattern.test(lead.businessName))) return { ok: false, reason: 'Blocked non-business/job/content lead' };
  try {
    const parsed = lead.notes ? JSON.parse(lead.notes) : {};
    const metadata = parsed?.metadata ?? parsed;
    const source = typeof metadata?.source === 'string' ? metadata.source.toUpperCase() : '';
    const leadType = typeof metadata?.leadType === 'string' ? metadata.leadType.toUpperCase() : '';
    if (BLOCKED_SOURCES.has(source)) return { ok: false, reason: `Blocked source: ${source}` };
    if (leadType && !VALID_LEAD_TYPES.has(leadType)) return { ok: false, reason: `Blocked lead type: ${leadType}` };
  } catch {
    // Legacy free-form notes remain allowed; contact/name checks still apply.
  }
  return { ok: true, reason: 'Contactable operational business lead' };
}

async function sendWhatsApp(to: string, message: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.WHATSAPP_API_VERSION ?? 'v23.0';
  if (!token || !phoneNumberId) throw new Error('WhatsApp credentials are not configured');
  const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: to.replace(/\D/g, ''), type: 'text', text: { preview_url: false, body: message } }),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message ?? `WhatsApp send failed (${response.status})`);
  return data?.messages?.[0]?.id as string | undefined;
}

async function sendEmail(to: string, message: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.OUTREACH_FROM_EMAIL;
  if (!apiKey || !from) throw new Error('Email credentials are not configured');
  const lines = message.split('\n');
  const subject = lines[0]?.startsWith('Subject:') ? lines[0].replace(/^Subject:\s*/i, '').trim() : 'A quick observation about your business';
  const text = lines[0]?.startsWith('Subject:') ? lines.slice(2).join('\n') : message;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, text }),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message ?? `Email send failed (${response.status})`);
  return data?.id as string | undefined;
}

export async function sendApprovedOutreach(id: string) {
  const prisma = getPrisma();
  const outreach = await prisma.outreach.findUnique({ where: { id }, include: { lead: true } });
  if (!outreach) throw new Error('Outreach not found');
  if (outreach.status === OutreachStatus.SENT) return { outreach, recipient: outreach.channel === OutreachChannel.WHATSAPP ? outreach.lead.whatsapp : outreach.lead.email, alreadySent: true };
  if (outreach.status !== OutreachStatus.APPROVED) throw new Error('Outreach must be approved before sending');

  if (outreach.channel === OutreachChannel.WHATSAPP) {
    const validation = leadIsSendable(outreach.lead);
    if (!validation.ok) throw new Error(validation.reason);
  }

  const queuedAt = new Date();
  const claimed = await prisma.outreach.updateMany({
    where: { id, status: OutreachStatus.APPROVED },
    data: { status: OutreachStatus.SCHEDULED, scheduledAt: queuedAt, error: null },
  });
  if (claimed.count !== 1) {
    const current = await prisma.outreach.findUnique({ where: { id } });
    if (current?.status === OutreachStatus.SENT) return { outreach: current, recipient: outreach.channel === OutreachChannel.WHATSAPP ? outreach.lead.whatsapp : outreach.lead.email, alreadySent: true };
    throw new Error('Outreach was claimed by another sender');
  }

  let providerMessageId: string | undefined;
  let channel: ConversationChannel;
  let recipient: string;
  try {
    if (outreach.channel === OutreachChannel.WHATSAPP) {
      recipient = outreach.lead.whatsapp ?? '';
      channel = ConversationChannel.WHATSAPP;
      providerMessageId = await sendWhatsApp(recipient, outreach.message);
    } else if (outreach.channel === OutreachChannel.EMAIL) {
      recipient = outreach.lead.email ?? '';
      channel = ConversationChannel.EMAIL;
      if (!recipient) throw new Error('Lead has no email address');
      providerMessageId = await sendEmail(recipient, outreach.message);
    } else {
      throw new Error(`Sending for ${outreach.channel} is not configured yet`);
    }

    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const sent = await tx.outreach.updateMany({ where: { id, status: OutreachStatus.SCHEDULED }, data: { status: OutreachStatus.SENT, sentAt: now, providerMessageId, error: null } });
      if (sent.count !== 1) throw new Error('Outreach state changed while provider was sending');
      const conversation = await tx.conversation.upsert({
        where: { leadId_channel: { leadId: outreach.leadId, channel } },
        create: { leadId: outreach.leadId, channel, status: 'OPEN', lastMessageAt: now },
        update: { lastMessageAt: now, status: 'OPEN' },
      });
      await tx.message.create({ data: { conversationId: conversation.id, direction: MessageDirection.OUTBOUND, content: outreach.message, providerMessageId } });
      await tx.lead.update({ where: { id: outreach.leadId }, data: { status: LeadStatus.CONTACTED } });
      const existingFollowUp = await tx.followUp.findFirst({ where: { leadId: outreach.leadId, status: { in: [FollowUpStatus.PENDING, FollowUpStatus.SCHEDULED] } } });
      if (!existingFollowUp) await tx.followUp.create({ data: { leadId: outreach.leadId, status: FollowUpStatus.PENDING, scheduledAt: new Date(now.getTime() + 3 * 86400000), notes: `Follow up after outreach ${outreach.id}` } });
      return tx.outreach.findUnique({ where: { id } });
    });
    return { outreach: result, recipient, alreadySent: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.outreach.updateMany({ where: { id, status: OutreachStatus.SCHEDULED }, data: { status: OutreachStatus.FAILED, error } }).catch(() => undefined);
    throw new Error(message);
  }
}
