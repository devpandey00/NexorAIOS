import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClients } from '@nexor/database';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';

const CHANNELS = ['WHATSAPP', 'EMAIL', 'INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'SMS'] as const;
type Channel = (typeof CHANNELS)[number];

function resolveRange(searchParams: URLSearchParams): { since: Date; until: Date | null; label: string } {
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  if (from) {
    const since = new Date(from);
    const until = to ? new Date(to) : null;
    if (!Number.isNaN(since.getTime()) && (!until || !Number.isNaN(until.getTime()))) {
      return { since, until, label: 'custom' };
    }
  }
  const range = searchParams.get('range') ?? 'today';
  const now = new Date();
  if (range === 'yesterday') {
    const since = new Date(now); since.setDate(since.getDate() - 1); since.setHours(0, 0, 0, 0);
    const until = new Date(since); until.setDate(until.getDate() + 1);
    return { since, until, label: 'yesterday' };
  }
  if (range === '7d') { const since = new Date(now); since.setDate(since.getDate() - 7); return { since, until: null, label: '7d' }; }
  if (range === '30d') { const since = new Date(now); since.setDate(since.getDate() - 30); return { since, until: null, label: '30d' }; }
  const since = new Date(now); since.setHours(0, 0, 0, 0);
  return { since, until: null, label: 'today' };
}

export async function GET(request: NextRequest) {
  if (!(await getSessionUser(request))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const channelParam = searchParams.get('channel')?.toUpperCase();
  const channel: Channel | null = CHANNELS.includes(channelParam as Channel) ? (channelParam as Channel) : null;
  const { since, until, label } = resolveRange(searchParams);

  try {
    const db = getDatabaseClients().read;

    const statsParams: unknown[] = [since];
    if (until) statsParams.push(until);
    const channelIndexAfterRange = statsParams.length + 1;
    if (channel) statsParams.push(channel);
    const channelOnlyParams: unknown[] = channel ? [channel] : [];

    const rangeClause = (column: string) => `${column} >= $1${until ? ` AND ${column} < $2` : ''}`;
    const channelClauseOutreach = channel ? `AND channel = $${channelIndexAfterRange}::outreach_channel` : '';
    const channelClauseConvJoin = channel ? `AND c.channel = $${channelIndexAfterRange}::conversation_channel` : '';

    const statsSql = `
      SELECT
        (SELECT COUNT(*) FROM public.outreach WHERE status = 'SENT' AND ${rangeClause('sent_at')} ${channelClauseOutreach}) AS sent,
        (SELECT COUNT(*) FROM public.outreach WHERE status = 'FAILED' AND ${rangeClause('updated_at')} ${channelClauseOutreach}) AS failed,
        (SELECT COUNT(*) FROM public.outreach WHERE status IN ('DRAFT','APPROVAL_REQUIRED') AND ${rangeClause('created_at')} ${channelClauseOutreach}) AS pending,
        (SELECT COUNT(*) FROM public.outreach WHERE status IN ('APPROVED','SCHEDULED') ${channelClauseOutreach}) AS queued,
        (SELECT COUNT(*) FROM public.messages m JOIN public.conversations c ON c.id = m.conversation_id WHERE m.direction = 'INBOUND' AND ${rangeClause('m.created_at')} ${channelClauseConvJoin}) AS replied
    `;

    const convSql = `
      SELECT
        c.id, c.channel::text AS channel, c.status, c.last_message_at,
        l.business_name AS company, l.whatsapp, l.email AS lead_email, l.status::text AS lead_status,
        camp.name AS campaign_name,
        (SELECT m.content FROM public.messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
        (SELECT f.scheduled_at FROM public.follow_ups f WHERE f.lead_id = l.id AND f.status IN ('PENDING','SCHEDULED') ORDER BY f.scheduled_at ASC LIMIT 1) AS next_follow_up
      FROM public.conversations c
      JOIN public.leads l ON l.id = c.lead_id
      LEFT JOIN public.campaigns camp ON camp.id = l.campaign_id
      ${channel ? 'WHERE c.channel = $1::conversation_channel' : ''}
      ORDER BY c.last_message_at DESC NULLS LAST
      LIMIT 30
    `;

    const queueSql = `
      SELECT status::text AS status, COUNT(*)::int AS count
      FROM public.outreach
      ${channel ? 'WHERE channel = $1::outreach_channel' : ''}
      GROUP BY status
    `;

    const [stats, conversations, queue, activity] = await Promise.all([
      db.$queryRawUnsafe<Array<{ sent: bigint; failed: bigint; pending: bigint; queued: bigint; replied: bigint }>>(statsSql, ...statsParams),
      db.$queryRawUnsafe<Array<Record<string, unknown>>>(convSql, ...channelOnlyParams),
      db.$queryRawUnsafe<Array<{ status: string; count: number }>>(queueSql, ...channelOnlyParams),
      db.$queryRawUnsafe<Array<Record<string, unknown>>>(`
        SELECT id, type, message, created_at
        FROM public.activity_events
        ORDER BY created_at DESC
        LIMIT 15
      `),
    ]);

    const row = stats[0];

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),
      range: { label, since: since.toISOString(), until: until?.toISOString() ?? null },
      channel: channel ?? 'ALL',
      stats: {
        sent: Number(row?.sent ?? 0),
        failed: Number(row?.failed ?? 0),
        pending: Number(row?.pending ?? 0),
        queued: Number(row?.queued ?? 0),
        replied: Number(row?.replied ?? 0),
      },
      conversations,
      queue: queue.map((q) => ({ status: q.status, count: Number(q.count) })),
      activity,
      note: 'Delivery/read receipts are not tracked yet — the OpenWA/Meta webhook would need to persist those states before this dashboard can show them honestly.',
    });
  } catch (error) {
    console.error('[COMMUNICATION CENTER OVERVIEW ERROR]', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Overview unavailable' }, { status: 500 });
  }
}
