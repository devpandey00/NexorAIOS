import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClients, OutreachChannel, OutreachStatus } from '@nexor/database';
import { verifyWhatsAppApprovalToken } from '@/lib/whatsapp-approval';

export const runtime = 'nodejs';

function prisma() { return getDatabaseClients().write; }
function page(title: string, body: string, status = 200) {
  return new NextResponse(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font-family:system-ui,sans-serif;background:#0b1020;color:#fff;margin:0;padding:32px}main{max-width:720px;margin:auto;background:#141b2f;border:1px solid #293451;border-radius:18px;padding:28px}h1{font-size:24px}p{line-height:1.6;color:#c8d0e3}.btn{display:inline-block;border:0;border-radius:12px;padding:14px 20px;background:#25d366;color:#06140b;font-weight:800;font-size:16px;cursor:pointer}</style></head><body><main>${body}</main></body></html>`, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

export async function GET(_req: NextRequest, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const { ids, expiresAt } = verifyWhatsAppApprovalToken(token);
    const rows = await prisma().outreach.findMany({ where: { id: { in: ids }, channel: OutreachChannel.WHATSAPP, status: OutreachStatus.APPROVAL_REQUIRED }, include: { lead: true }, orderBy: { createdAt: 'asc' } });
    if (!rows.length) return page('Nothing to approve', '<h1>Nothing is waiting for approval.</h1><p>This batch may already have been approved, cancelled, or expired.</p>');
    const names = rows.slice(0, 20).map((row) => `<li>${escapeHtml(row.lead.businessName)} — ${escapeHtml(row.lead.country)}</li>`).join('');
    return page('Approve WhatsApp batch', `<h1>Approve the next WhatsApp batch?</h1><p><strong>${rows.length}</strong> international business leads are queued. After approval, Nexor will send this batch sequentially with a 10-second minimum gap between sends.</p><ul>${names}</ul><p>This approval link expires ${expiresAt.toISOString()}.</p><form method="post"><button class="btn" type="submit">Approve ${rows.length} messages</button></form><p>Only approved WhatsApp outreach will be sent. No new batch is auto-approved.</p>`);
  } catch (error) {
    return page('Approval link error', `<h1>Approval link unavailable</h1><p>${escapeHtml(error instanceof Error ? error.message : String(error))}</p>`, 400);
  }
}

export async function POST(_req: NextRequest, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const { ids } = verifyWhatsAppApprovalToken(token);
    const now = Date.now();
    const rows = await prisma().outreach.findMany({ where: { id: { in: ids }, channel: OutreachChannel.WHATSAPP, status: OutreachStatus.APPROVAL_REQUIRED }, orderBy: { createdAt: 'asc' }, select: { id: true } });
    if (!rows.length) return page('Already handled', '<h1>No messages were approved.</h1><p>This batch is no longer waiting for approval.</p>');
    const scheduledIds = rows.slice(0, 20).map((row, index) => ({ id: row.id, scheduledAt: new Date(now + 10_000 + index * 10_000) }));
    const db = prisma();
    await db.$transaction(scheduledIds.map((item) => db.outreach.updateMany({ where: { id: item.id, channel: OutreachChannel.WHATSAPP, status: OutreachStatus.APPROVAL_REQUIRED }, data: { status: OutreachStatus.APPROVED, approvedAt: new Date(), scheduledAt: item.scheduledAt, error: null } })));
    return page('Batch approved', `<h1>✅ Batch approved</h1><p><strong>${scheduledIds.length}</strong> WhatsApp messages are approved. The first send is scheduled in about 10 seconds and the remaining messages are spaced 10 seconds apart.</p><p>Nexor will stop after this batch; the next 20 will require a fresh email approval.</p>`);
  } catch (error) {
    return page('Approval failed', `<h1>Approval failed</h1><p>${escapeHtml(error instanceof Error ? error.message : String(error))}</p>`, 400);
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char] ?? char);
}
