import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClients, OutreachChannel, OutreachStatus } from '@nexor/database';
import { getWhatsAppProviderStatus } from '@/lib/outreach-sender';
import { isAutomationEnabled } from '@/lib/automation-settings';

export const runtime = 'nodejs';

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim() || process.env.OUTREACH_API_SECRET?.trim();
  return Boolean(secret && req.headers.get('authorization') === `Bearer ${secret}`);
}

function metadata(notes: string | null) {
  try {
    const parsed = notes ? JSON.parse(notes) : {};
    return parsed?.metadata ?? parsed ?? {};
  } catch {
    return {};
  }
}

function eligible(lead: { businessName: string; country: string | null; whatsapp: string | null; notes: string | null }) {
  if (!lead.whatsapp) return false;
  if (!lead.country?.trim() || /^(india|in|ind)$/i.test(lead.country.trim())) return false;
  const meta = metadata(lead.notes);
  const optIn = meta.whatsappOptIn === true || meta.whatsappOptIn === 'true' || meta.whatsapp_opt_in === true || meta.whatsapp_opt_in === 'true';
  if (!optIn) return false;
  if (/\b(jobs?|vacanc(?:y|ies)|careers?|hiring|salary|resume|cv|internship|recruitment|directory|guide|article|news)\b/i.test(lead.businessName)) return false;
  const source = typeof meta.source === 'string' ? meta.source.toUpperCase() : '';
  return !new Set(['JOB', 'JOB_SEARCH', 'JOB-SEARCH', 'RECRUITMENT', 'CAREER', 'JOB_PORTAL']).has(source);
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  if (!(await isAutomationEnabled('whatsapp_sending'))) return NextResponse.json({ success: true, skipped: true, reason: 'AUTOMATION_DISABLED' });

  const provider = getWhatsAppProviderStatus();
  if (!provider.openwaConfigured && !provider.templateConfigured) {
    return NextResponse.json({ success: true, promoted: 0, blocked: true, reason: 'WHATSAPP_TEMPLATE_REQUIRED', provider });
  }

  const prisma = getDatabaseClients().write;
  const limit = Math.min(Math.max(Number(process.env.WHATSAPP_BATCH_SIZE ?? 10), 1), 20);
  const delayMs = Math.max(Number(process.env.WHATSAPP_MIN_DELAY_MS ?? 10000), 10000);
  const rows = await prisma.outreach.findMany({
    where: { channel: OutreachChannel.WHATSAPP, status: { in: [OutreachStatus.DRAFT, OutreachStatus.APPROVAL_REQUIRED] } },
    include: { lead: true },
    orderBy: { createdAt: 'asc' },
    take: limit * 2,
  });

  const eligibleRows = rows.filter((row) => eligible(row.lead)).slice(0, limit);
  const firstAt = Date.now() + delayMs;
  let promoted = 0;
  for (let index = 0; index < eligibleRows.length; index += 1) {
    const row = eligibleRows[index];
    const result = await prisma.outreach.updateMany({
      where: { id: row.id, channel: OutreachChannel.WHATSAPP, status: { in: [OutreachStatus.DRAFT, OutreachStatus.APPROVAL_REQUIRED] } },
      data: { status: OutreachStatus.APPROVED, approvedAt: new Date(), scheduledAt: new Date(firstAt + index * delayMs), error: null },
    });
    promoted += result.count;
  }

  return NextResponse.json({ success: true, promoted, considered: rows.length, scheduledFrom: promoted ? new Date(firstAt).toISOString() : null, delayMs, provider });
}
