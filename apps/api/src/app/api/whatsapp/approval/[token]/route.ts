import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { getDatabaseClients, OutreachChannel, OutreachStatus } from '@nexor/database';
import { verifyWhatsAppApprovalToken } from '@/lib/whatsapp-approval';
import { getWhatsAppProviderStatus, sendApprovedOutreach } from '@/lib/outreach-sender';

export const runtime = 'nodejs';
export const maxDuration = 300;

function prisma() { return getDatabaseClients().write; }
function page(title: string, body: string, status = 200) {
  return new NextResponse(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font-family:system-ui,sans-serif;background:#0b1020;color:#fff;margin:0;padding:32px}main{max-width:720px;margin:auto;background:#141b2f;border:1px solid #293451;border-radius:18px;padding:28px}h1{font-size:24px}p{line-height:1.6;color:#c8d0e3}.btn{display:inline-block;border:0;border-radius:12px;padding:14px 20px;background:#25d366;color:#06140b;font-weight:800;font-size:16px;cursor:pointer}</style></head><body><main>${body}</main></body></html>`, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

function optInAndInternational(notes: string | null, country: string | null) {
  let metadata: any = {};
  try { const parsed = notes ? JSON.parse(notes) : {}; metadata = parsed?.metadata ?? parsed ?? {}; } catch { return false; }
  const optIn = metadata?.whatsappOptIn === true || metadata?.whatsappOptIn === 'true' || metadata?.whatsapp_opt_in === true || metadata?.whatsapp_opt_in === 'true';
  return optIn && Boolean(country?.trim()) && !/^(india|in|ind)$/i.test(country!.trim());
}

async function loadRows(ids: string[]) {
  return prisma().outreach.findMany({ where: { id: { in: ids }, channel: OutreachChannel.WHATSAPP, status: OutreachStatus.APPROVAL_REQUIRED }, include: { lead: true }, orderBy: { createdAt: 'asc' }, take: 20 });
}

async function sendApprovedBatch(ids: string[]) {
  const delayMs = Math.max(Number(process.env.WHATSAPP_MIN_DELAY_MS ?? 10000), 10000);
  let sent = 0;
  let failed = 0;
  for (let index = 0; index < ids.length; index += 1) {
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
    try {
      const result = await sendApprovedOutreach(ids[index]);
      if (!result.alreadySent) sent += 1;
    } catch (error) {
      failed += 1;
      console.error('[WHATSAPP APPROVAL SEND]', ids[index], error instanceof Error ? error.message : String(error));
    }
  }
  console.info('[WHATSAPP APPROVAL BATCH]', { count: ids.length, sent, failed });
}

export async function GET(_req: NextRequest, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const { ids, expiresAt } = verifyWhatsAppApprovalToken(token);
    const provider = getWhatsAppProviderStatus();
    if (!provider.openwaConfigured && !provider.templateConfigured) return page('WhatsApp paused', '<h1>WhatsApp sending is paused</h1><p>An approved Meta message template is still required before this batch can be approved.</p>', 409);
    const rows = await loadRows(ids);
    const eligible = rows.filter((row) => optInAndInternational(row.lead.notes, row.lead.country));
    if (!eligible.length) return page('Nothing to approve', '<h1>Nothing is eligible for approval.</h1><p>This batch has no international lead with a recorded WhatsApp opt-in.</p>');
    const names = eligible.map((row) => `<li>${escapeHtml(row.lead.businessName)} — ${escapeHtml(row.lead.country)}</li>`).join('');
    return page('Approve WhatsApp batch', `<h1>Approve the next WhatsApp batch?</h1><p><strong>${eligible.length}</strong> international opt-in business leads are queued. After approval, Nexor will send this batch sequentially with a minimum 10-second gap.</p><ul>${names}</ul><p>This approval link expires ${expiresAt.toISOString()}.</p><form method="post"><button class="btn" type="submit">Approve ${eligible.length} messages</button></form><p>No new batch is auto-approved.</p>`);
  } catch (error) {
    return page('Approval link error', `<h1>Approval link unavailable</h1><p>${escapeHtml(error instanceof Error ? error.message : String(error))}</p>`, 400);
  }
}

export async function POST(_req: NextRequest, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const { ids } = verifyWhatsAppApprovalToken(token);
    const provider = getWhatsAppProviderStatus();
    if (!provider.openwaConfigured && !provider.templateConfigured) return page('WhatsApp paused', '<h1>WhatsApp sending is paused</h1><p>Meta requires an approved message template for business-initiated conversations. Approve the template first, then retry this email link.</p>', 409);
    const rows = await loadRows(ids);
    const eligible = rows.filter((row) => optInAndInternational(row.lead.notes, row.lead.country));
    if (!eligible.length) return page('Nothing approved', '<h1>No eligible messages were approved.</h1><p>The batch requires international recipients with recorded WhatsApp opt-in.</p>');
    const db = prisma();
    await db.$transaction(eligible.map((row) => db.outreach.updateMany({ where: { id: row.id, channel: OutreachChannel.WHATSAPP, status: OutreachStatus.APPROVAL_REQUIRED }, data: { status: OutreachStatus.APPROVED, approvedAt: new Date(), scheduledAt: new Date(), error: null } })));
    const scheduledIds = eligible.map((row) => row.id);
    after(async () => { await sendApprovedBatch(scheduledIds); });
    return page('Batch approved', `<h1>✅ Batch approved</h1><p><strong>${scheduledIds.length}</strong> WhatsApp messages are approved and sending has started. Nexor will send them sequentially with a minimum 10-second gap and record provider-confirmed results.</p><p>If the provider rejects a message, it will remain visible as FAILED with the real provider error.</p>`);
  } catch (error) {
    return page('Approval failed', `<h1>Approval failed</h1><p>${escapeHtml(error instanceof Error ? error.message : String(error))}</p>`, 400);
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char] ?? char);
}
