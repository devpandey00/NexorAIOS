import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClients, OutreachChannel, OutreachStatus } from '@nexor/database';

export const runtime = 'nodejs';
export const maxDuration = 120;
const db = getDatabaseClients().write;

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return !secret || req.headers.get('authorization') === `Bearer ${secret}`;
}

async function sendEmail(to: string, message: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.OUTREACH_FROM_EMAIL;
  if (!apiKey || !from) throw new Error('RESEND_API_KEY or OUTREACH_FROM_EMAIL is missing');
  const lines = message.split('\n');
  const subject = lines[0]?.startsWith('Subject:') ? lines[0].replace(/^Subject:\s*/i, '').trim() : 'A quick growth observation';
  const text = lines[0]?.startsWith('Subject:') ? lines.slice(2).join('\n') : message;
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [to], subject, text }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message ?? `Email send failed (${response.status})`);
  return data?.id as string | undefined;
}

async function sendWhatsApp(to: string, message: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const template = process.env.WHATSAPP_TEMPLATE_NAME;
  const language = process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? 'en_US';
  if (!token || !phoneNumberId || !template) throw new Error('WhatsApp credentials/template are missing');
  const response = await fetch(`https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION ?? 'v23.0'}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: to.replace(/\D/g, ''), type: 'template', template: { name: template, language: { code: language }, components: [{ type: 'body', parameters: [{ type: 'text', text: message.slice(0, 1024) }] }] } }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message ?? `WhatsApp send failed (${response.status})`);
  return data?.messages?.[0]?.id as string | undefined;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const take = Math.min(Math.max(Number(process.env.OUTREACH_MAX_PER_RUN ?? 2), 1), 10);
  const items = await db.outreach.findMany({ where: { status: OutreachStatus.SCHEDULED, scheduledAt: { lte: new Date() } }, orderBy: { scheduledAt: 'asc' }, take, include: { lead: true } });
  const results = [];

  for (const item of items) {
    try {
      if (item.channel === OutreachChannel.WHATSAPP) {
        let optIn = false;
        try { optIn = Boolean(JSON.parse(item.lead.notes ?? '{}')?.whatsappOptIn); } catch { optIn = false; }
        if (!optIn) throw new Error('WhatsApp send blocked: no recorded whatsappOptIn');
        if (!item.lead.whatsapp) throw new Error('Lead has no WhatsApp number');
        const providerMessageId = await sendWhatsApp(item.lead.whatsapp, item.message);
        await db.outreach.update({ where: { id: item.id }, data: { status: OutreachStatus.SENT, sentAt: new Date(), providerMessageId, error: null } });
        results.push({ id: item.id, success: true, channel: 'WHATSAPP' });
      } else if (item.channel === OutreachChannel.EMAIL) {
        if (!item.lead.email) throw new Error('Lead has no email address');
        const providerMessageId = await sendEmail(item.lead.email, item.message);
        await db.outreach.update({ where: { id: item.id }, data: { status: OutreachStatus.SENT, sentAt: new Date(), providerMessageId, error: null } });
        results.push({ id: item.id, success: true, channel: 'EMAIL' });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await db.outreach.update({ where: { id: item.id }, data: { error: message } }).catch(() => undefined);
      results.push({ id: item.id, success: false, error: message });
    }
    const delay = Math.max(Number(process.env.OUTREACH_MIN_DELAY_MS ?? 2000), 0);
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
  }
  return NextResponse.json({ success: true, queued: items.length, results });
}
