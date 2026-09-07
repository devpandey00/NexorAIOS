import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClients } from '@nexor/database';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';

function configured(name: string) {
  return Boolean(process.env[name]?.trim());
}

async function authorized(request: NextRequest) {
  const user = await getSessionUser(request);
  return Boolean(user);
}

function int(value: unknown) {
  return Number(value ?? 0);
}

export async function GET(request: NextRequest) {
  if (!(await authorized(request))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getDatabaseClients().read;
    const [summaryRows, stageRows, hotLeads, activityRows] = await Promise.all([
      db.$queryRawUnsafe<Array<Record<string, unknown>>>(`
        SELECT
          (SELECT COUNT(*) FROM public.leads)::int AS total_leads,
          (SELECT COUNT(*) FROM public.leads WHERE status = 'QUALIFIED')::int AS qualified_leads,
          (SELECT COUNT(*) FROM public.leads WHERE status IN ('QUALIFIED','PITCH_READY'))::int AS outreach_ready,
          (SELECT COUNT(*) FROM public.leads WHERE status = 'REPLIED')::int AS replied_leads,
          (SELECT COUNT(*) FROM public.leads WHERE status = 'MEETING_BOOKED')::int AS meeting_leads,
          (SELECT COUNT(*) FROM public.leads WHERE status = 'PROPOSAL_SENT')::int AS proposal_leads,
          (SELECT COUNT(*) FROM public.leads WHERE status = 'WON')::int AS won_leads,
          (SELECT COALESCE(SUM(value),0) FROM public.opportunities WHERE stage = 'WON')::numeric AS won_revenue,
          (SELECT COUNT(*) FROM public.outreach WHERE status = 'SENT' AND created_at >= CURRENT_DATE)::int AS sent_today,
          (SELECT COUNT(*) FROM public.outreach WHERE channel = 'EMAIL' AND status = 'SENT' AND created_at >= CURRENT_DATE)::int AS email_sent_today,
          (SELECT COUNT(*) FROM public.outreach WHERE channel = 'WHATSAPP' AND status = 'SENT' AND created_at >= CURRENT_DATE)::int AS whatsapp_sent_today,
          (SELECT COUNT(*) FROM public.follow_ups WHERE status = 'COMPLETED' AND updated_at >= CURRENT_DATE)::int AS followups_today,
          (SELECT COUNT(*) FROM public.messages WHERE direction = 'INBOUND' AND created_at >= CURRENT_DATE)::int AS inbound_today,
          (SELECT COUNT(*) FROM public.messages WHERE direction = 'INBOUND' AND created_at >= CURRENT_DATE)::int AS replies_today,
          (SELECT COUNT(*) FROM public.jobs WHERE status IN ('FAILED','RETRYING') AND created_at >= CURRENT_DATE)::int AS problem_jobs_today,
          (SELECT COUNT(*) FROM public.campaigns WHERE status = 'RUNNING')::int AS running_campaigns
      `),
      db.$queryRawUnsafe<Array<{ stage: string; count: number }>>(`
        SELECT stage::text AS stage, COUNT(*)::int AS count
        FROM public.opportunities
        GROUP BY stage
      `),
      db.$queryRawUnsafe<Array<Record<string, unknown>>>(`
        SELECT id, business_name, country, niche, audit_score, status::text AS status
        FROM public.leads
        WHERE audit_score IS NOT NULL
        ORDER BY audit_score DESC, updated_at DESC
        LIMIT 5
      `),
      db.$queryRawUnsafe<Array<Record<string, unknown>>>(`
        SELECT id, type, message, created_at
        FROM public.activity_events
        ORDER BY created_at DESC
        LIMIT 8
      `),
    ]);

    const summary = summaryRows[0] ?? {};
    const stageMap = Object.fromEntries(stageRows.map((row) => [row.stage, int(row.count)]));

    const integrations = {
      database: 'CONNECTED',
      email: configured('RESEND_API_KEY') ? 'CONFIGURED' : 'CONFIG_REQUIRED',
      whatsapp: configured('WHATSAPP_ACCESS_TOKEN') && configured('WHATSAPP_PHONE_NUMBER_ID') ? 'CONFIGURED' : 'CONFIG_REQUIRED',
      meta: configured('META_ACCESS_TOKEN') ? 'CONFIGURED' : 'CONFIG_REQUIRED',
      instagram: configured('META_ACCESS_TOKEN') && configured('META_INSTAGRAM_USER_ID') ? 'CONFIGURED' : 'CONFIG_REQUIRED',
      facebook: configured('META_ACCESS_TOKEN') && configured('META_PAGE_ID') ? 'CONFIGURED' : 'CONFIG_REQUIRED',
      linkedin: configured('LINKEDIN_ACCESS_TOKEN') ? 'CONFIGURED' : 'CONFIG_REQUIRED',
      youtube: configured('YOUTUBE_ACCESS_TOKEN') || configured('YOUTUBE_REFRESH_TOKEN') ? 'CONFIGURED' : 'CONFIG_REQUIRED',
      x: configured('X_ACCESS_TOKEN') ? 'CONFIGURED' : 'CONFIG_REQUIRED',
      leadDiscovery: configured('SCRAPLING_BASE_URL') || configured('SCRAPLING_API_KEY') ? 'CONFIGURED' : 'CONFIG_REQUIRED',
      cron: configured('CRON_SECRET') ? 'CONFIGURED' : 'CONFIG_REQUIRED',
    };

    return NextResponse.json({
      success: true,
      generatedAt: new Date().toISOString(),
      today: {
        totalLeads: int(summary.total_leads),
        qualified: int(summary.qualified_leads),
        outreachReady: int(summary.outreach_ready),
        replied: int(summary.replies_today),
        positiveReplies: int(summary.replied_leads),
        meetings: int(summary.meeting_leads),
        proposals: int(summary.proposal_leads),
        won: int(summary.won_leads),
        revenue: String(summary.won_revenue ?? '0'),
        emailsSent: int(summary.email_sent_today),
        whatsappSent: int(summary.whatsapp_sent_today),
        followups: int(summary.followups_today),
        failedJobs: int(summary.problem_jobs_today),
        runningCampaigns: int(summary.running_campaigns),
      },
      pipeline: {
        open: int(stageMap.OPEN),
        qualified: int(stageMap.QUALIFIED),
        proposal: int(stageMap.PROPOSAL),
        won: int(stageMap.WON),
        lost: int(stageMap.LOST),
      },
      hotLeads,
      activity: activityRows,
      integrations,
      autopilot: {
        enabled: process.env.NEXOR_AUTOPILOT_ENABLED !== 'false',
      },
    });
  } catch (error) {
    console.error('[FOUNDER OVERVIEW ERROR]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Overview unavailable' },
      { status: 500 },
    );
  }
}
