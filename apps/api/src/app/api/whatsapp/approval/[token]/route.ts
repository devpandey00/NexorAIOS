import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClients, OutreachChannel, OutreachStatus } from '@nexor/database';
import { verifyWhatsAppApprovalToken } from '@/lib/whatsapp-approval';
import { getWhatsAppProviderStatus } from '@/lib/outreach-sender';

export const runtime = 'nodejs';

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
    const delayMs = Math.max(Number(process.env.WHATSAPP_MIN_DELAY_MS ?? 10000), 10000);
    const now = Date.now();
    const scheduledIds = eligible.slice(0, 20).map((row, index) => ({ id: row.id, scheduledAt: new Date(now + delayMs + index * delayMs) }));
    const db = prisma();
    await db.$transaction(scheduledIds.map((item) => db.outreach.updateMany({ where: { id: item.id, channel: OutreachChannel.WHATSAPP, status: OutreachStatus.APPROVAL_REQUIRED }, data: { status: OutreachStatus.APPROVED, approvedAt: new Date(), scheduledAt: item.scheduledAt, error: null } })));
    return page('Batch approved', `<h1>✅ Batch approved</h1><p><strong>${scheduledIds.length}</strong> WhatsApp messages are approved. The first send is scheduled in about ${Math.round(delayMs / 1000)} seconds and the remaining messages are spaced at least ${Math.round(delayMs / 1000)} seconds apart.</p><p>Nexor will stop after this batch; the next batch requires a fresh approval email.</p>`);
  } catch (error) {
    return page('Approval failed', `<h1>Approval failed</h1><p>${escapeHtml(error instanceof Error ? error.message : String(error))}</p>`, 400);
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char] ?? char);
}
