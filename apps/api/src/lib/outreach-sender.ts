import {
  ConversationChannel,
  FollowUpStatus,
  getDatabaseClients,
  LeadStatus,
  MessageDirection,
  OutreachChannel,
  OutreachStatus,
} from '@nexor/database';

function getPrisma() { return getDatabaseClients().write; }

const BLOCKED_NAME_PATTERNS = [/\bjobs?\b/i, /\bvacanc(?:y|ies)\b/i, /\bcareers?\b/i, /\bhiring\b/i, /\bsalary\b/i, /\bapply now\b/i, /\bresume\b/i, /\bcv\b/i, /\binternship\b/i, /\brecruitment\b/i, /\btop\b/i, /\bbest\b/i, /\blist\b/i, /\bdirectory\b/i, /\bguide\b/i, /\barticle\b/i, /\bnews\b/i];
const BLOCKED_SOURCES = new Set(['JOB', 'JOB_SEARCH', 'JOB-SEARCH', 'RECRUITMENT', 'CAREER', 'JOB_PORTAL']);
const VALID_LEAD_TYPES = new Set(['BUSINESS', 'COMPANY', 'LOCAL_BUSINESS', 'AGENCY', 'PROFESSIONAL_SERVICE']);
const MANUAL_SOCIAL_CHANNELS: Set<OutreachChannel> = new Set([OutreachChannel.INSTAGRAM, OutreachChannel.FACEBOOK, OutreachChannel.LINKEDIN]);
const MANUAL_PENDING = 'MANUAL_PENDING' as OutreachStatus;

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
  } catch { /* legacy notes */ }
  return { ok: true, reason: 'Contactable operational business lead' };
}

function whatsappConfig() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME?.trim();
  const templateLanguage = process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || 'en_US';
  return { token, phoneNumberId, templateName, templateLanguage, configured: Boolean(token && phoneNumberId) };
}

export function getWhatsAppProviderStatus() {
  const config = whatsappConfig();
  return {
    configured: config.configured,
    mode: config.templateName ? 'template' : 'session_text',
    templateConfigured: Boolean(config.templateName),
    templateLanguage: config.templateLanguage,
  };
}

async function sendWhatsApp(to: string, message: string) {
  const { token, phoneNumberId, templateName, templateLanguage } = whatsappConfig();
  const version = process.env.WHATSAPP_API_VERSION ?? 'v23.0';
  if (!token || !phoneNumberId) {
    throw new Error('WhatsApp Cloud API is not configured: add WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID in Vercel Production.');
  }

  const recipient = to.replace(/\D/g, '');
  if (!recipient || recipient.length < 8) throw new Error('Lead WhatsApp number is invalid after normalization.');

  // Cold/business-initiated WhatsApp outreach must use a Meta-approved template.
  // Set WHATSAPP_TEMPLATE_NAME + WHATSAPP_TEMPLATE_LANGUAGE for automated first contact.
  // The template should contain one body variable ({{1}}) used for the personalized message.
  const payload = templateName
    ? {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipient,
        type: 'template',
        template: {
          name: templateName,
          language: { code: templateLanguage },
          components: [{ type: 'body', parameters: [{ type: 'text', text: message }] }],
        },
      }
    : {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipient,
        type: 'text',
        text: { preview_url: false, body: message },
      };

  const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const providerMessage = data?.error?.message ?? `WhatsApp send failed (${response.status})`;
    const code = data?.error?.code ? ` [Meta ${data.error.code}]` : '';
    if (!templateName && (data?.error?.code === 131047 || /24.?hour|template/i.test(providerMessage))) {
      throw new Error('Meta rejected this first-contact message because it is outside the WhatsApp customer-service window. Configure an approved WHATSAPP_TEMPLATE_NAME and WHATSAPP_TEMPLATE_LANGUAGE for cold outreach.');
    }
    throw new Error(`${providerMessage}${code}`);
  }
  return data?.messages?.[0]?.id as string | undefined;
}

export async function sendEmail(to: string, message: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.OUTREACH_FROM_EMAIL;
  if (!apiKey || !from) throw new Error('Email credentials are not configured');
  const lines = message.split('\n');
  const subject = lines[0]?.startsWith('Subject:') ? lines[0].replace(/^Subject:\s*/i, '').trim() : 'A quick observation about your business';
  const text = lines[0]?.startsWith('Subject:') ? lines.slice(2).join('\n') : message;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, text }), cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message ?? `Email send failed (${response.status})`);
  return data?.id as string | undefined;
}

export async function sendApprovedOutreach(id: string) {
  const prisma = getPrisma();
  const outreach = await prisma.outreach.findUnique({ where: { id }, include: { lead: { include: { socialProfiles: true } } } });
  if (!outreach) throw new Error('Outreach not found');
  if (outreach.status === OutreachStatus.SENT) return { outreach, recipient: outreach.channel === OutreachChannel.WHATSAPP ? outreach.lead.whatsapp : outreach.lead.email, alreadySent: true };
  if (outreach.status !== OutreachStatus.APPROVED) throw new Error('Outreach must be approved before sending');

  if (outreach.channel === OutreachChannel.WHATSAPP) {
    const validation = leadIsSendable(outreach.lead);
    if (!validation.ok) throw new Error(validation.reason);
  }

  if (MANUAL_SOCIAL_CHANNELS.has(outreach.channel)) {
    const profile = outreach.lead.socialProfiles.find((item) => item.platform === outreach.channel);
    if (!profile?.url) throw new Error(`No saved ${outreach.channel} profile URL for manual send`);
    const claimed = await prisma.outreach.updateMany({ where: { id, status: OutreachStatus.APPROVED }, data: { status: MANUAL_PENDING, scheduledAt: new Date(), error: null } });
    if (claimed.count !== 1) {
      const current = await prisma.outreach.findUnique({ where: { id } });
      if (current?.status === MANUAL_PENDING || current?.status === OutreachStatus.SENT) return { outreach: current, recipient: profile.url, manual: true, alreadySent: current.status === OutreachStatus.SENT };
      throw new Error('Outreach was claimed by another sender');
    }
    return { outreach: await prisma.outreach.findUnique({ where: { id } }), recipient: profile.url, profileUrl: profile.url, manual: true, alreadySent: false };
  }

  const queuedAt = new Date();
  const claimed = await prisma.outreach.updateMany({ where: { id, status: OutreachStatus.APPROVED }, data: { status: OutreachStatus.SCHEDULED, scheduledAt: queuedAt, error: null } });
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
      throw new Error(`Unsupported automated outreach channel: ${outreach.channel}`);
    }

    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const sent = await tx.outreach.updateMany({ where: { id, status: OutreachStatus.SCHEDULED }, data: { status: OutreachStatus.SENT, sentAt: now, providerMessageId, error: null } });
      if (sent.count !== 1) throw new Error('Outreach state changed while provider was sending');
      const conversation = await tx.conversation.upsert({ where: { leadId_channel: { leadId: outreach.leadId, channel } }, create: { leadId: outreach.leadId, channel, status: 'OPEN', lastMessageAt: now }, update: { lastMessageAt: now, status: 'OPEN' } });
      await tx.message.create({ data: { conversationId: conversation.id, direction: MessageDirection.OUTBOUND, content: outreach.message, providerMessageId } });
      await tx.lead.update({ where: { id: outreach.leadId }, data: { status: LeadStatus.CONTACTED } });
      const existingFollowUp = await tx.followUp.findFirst({ where: { leadId: outreach.leadId, status: { in: [FollowUpStatus.PENDING, FollowUpStatus.SCHEDULED] } } });
      if (!existingFollowUp) await tx.followUp.create({ data: { leadId: outreach.leadId, status: FollowUpStatus.PENDING, scheduledAt: new Date(now.getTime() + 3 * 86400000), notes: `Follow up after outreach ${outreach.id}` } });
      return tx.outreach.findUnique({ where: { id } });
    });
    return { outreach: result, recipient, alreadySent: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.outreach.updateMany({ where: { id, status: OutreachStatus.SCHEDULED }, data: { status: OutreachStatus.FAILED, error: message } }).catch(() => undefined);
    throw new Error(message);
  }
}

export async function confirmManualOutreachSent(id: string) {
  const prisma = getPrisma();
  const existing = await prisma.outreach.findUnique({ where: { id }, include: { lead: true } });
  if (!existing) throw new Error('Outreach not found');
  if (existing.status === OutreachStatus.SENT) return { outreach: existing, alreadySent: true };
  if (existing.status !== MANUAL_PENDING) throw new Error('Outreach is not awaiting manual confirmation');
  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const confirmed = await tx.outreach.updateMany({ where: { id, status: MANUAL_PENDING }, data: { status: OutreachStatus.SENT, sentAt: now, error: null } });
    if (confirmed.count !== 1) throw new Error('Manual send was already confirmed by another request');
    const channel = existing.channel as unknown as ConversationChannel;
    const conversation = await tx.conversation.upsert({ where: { leadId_channel: { leadId: existing.leadId, channel } }, create: { leadId: existing.leadId, channel, status: 'OPEN', lastMessageAt: now }, update: { lastMessageAt: now, status: 'OPEN' } });
    await tx.message.create({ data: { conversationId: conversation.id, direction: MessageDirection.OUTBOUND, content: existing.message } });
    await tx.lead.update({ where: { id: existing.leadId }, data: { status: LeadStatus.CONTACTED } });
    const existingFollowUp = await tx.followUp.findFirst({ where: { leadId: existing.leadId, status: { in: [FollowUpStatus.PENDING, FollowUpStatus.SCHEDULED] } } });
    if (!existingFollowUp) await tx.followUp.create({ data: { leadId: existing.leadId, status: FollowUpStatus.PENDING, scheduledAt: new Date(now.getTime() + 3 * 86400000), notes: `Follow up after manual outreach ${existing.id}` } });
    return tx.outreach.findUnique({ where: { id } });
  });
  return { outreach: result, alreadySent: false };
}
