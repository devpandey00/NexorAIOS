import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClients } from '@nexor/database';
import { getSessionUser } from '@/lib/auth';
import { getAutomationSettings } from '@/lib/automation-settings';

export const runtime = 'nodejs';
function configured(name: string) { return Boolean(process.env[name]?.trim()); }
function int(value: unknown) { return Number(value ?? 0); }
function range(request: NextRequest) {
  const now = new Date(); const fallbackFrom = new Date(now); fallbackFrom.setHours(0, 0, 0, 0);
  const from = request.nextUrl.searchParams.get('from') ? new Date(String(request.nextUrl.searchParams.get('from'))) : fallbackFrom;
  const to = request.nextUrl.searchParams.get('to') ? new Date(String(request.nextUrl.searchParams.get('to'))) : now;
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) throw new Error('Invalid report date range');
  return { from: from.toISOString(), to: to.toISOString() };
}

export async function GET(request: NextRequest) {
  if (!(await getSessionUser(request))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const db = getDatabaseClients().read; const { from, to } = range(request);
    const [summaryRows, stageRows, hotLeads, activityRows, automationSettings, socialRows] = await Promise.all([
      db.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT
        (SELECT COUNT(*) FROM public.leads WHERE created_at >= '${from}'::timestamptz AND created_at < '${to}'::timestamptz)::int AS total_leads,
        (SELECT COUNT(*) FROM public.leads WHERE status = 'QUALIFIED' AND updated_at >= '${from}'::timestamptz AND updated_at < '${to}'::timestamptz)::int AS qualified_leads,
        (SELECT COUNT(*) FROM public.leads WHERE status IN ('QUALIFIED','PITCH_READY') AND updated_at >= '${from}'::timestamptz AND updated_at < '${to}'::timestamptz)::int AS outreach_ready,
        (SELECT COUNT(*) FROM public.leads WHERE status = 'REPLIED' AND updated_at >= '${from}'::timestamptz AND updated_at < '${to}'::timestamptz)::int AS replied_leads,
        (SELECT COUNT(*) FROM public.leads WHERE status = 'MEETING_BOOKED' AND updated_at >= '${from}'::timestamptz AND updated_at < '${to}'::timestamptz)::int AS meeting_leads,
        (SELECT COUNT(*) FROM public.leads WHERE status = 'PROPOSAL_SENT' AND updated_at >= '${from}'::timestamptz AND updated_at < '${to}'::timestamptz)::int AS proposal_leads,
        (SELECT COUNT(*) FROM public.leads WHERE status = 'WON' AND updated_at >= '${from}'::timestamptz AND updated_at < '${to}'::timestamptz)::int AS won_leads,
        (SELECT COALESCE(SUM(value),0) FROM public.opportunities WHERE stage = 'WON' AND updated_at >= '${from}'::timestamptz AND updated_at < '${to}'::timestamptz)::numeric AS won_revenue,
        (SELECT COUNT(*) FROM public.outreach WHERE status = 'SENT' AND sent_at >= '${from}'::timestamptz AND sent_at < '${to}'::timestamptz)::int AS sent,
        (SELECT COUNT(*) FROM public.outreach WHERE channel = 'EMAIL' AND status = 'SENT' AND sent_at >= '${from}'::timestamptz AND sent_at < '${to}'::timestamptz)::int AS email_sent,
        (SELECT COUNT(*) FROM public.outreach WHERE channel = 'WHATSAPP' AND status = 'SENT' AND sent_at >= '${from}'::timestamptz AND sent_at < '${to}'::timestamptz)::int AS whatsapp_sent,
        (SELECT COUNT(*) FROM public.outreach WHERE channel = 'INSTAGRAM' AND status = 'SENT' AND sent_at >= '${from}'::timestamptz AND sent_at < '${to}'::timestamptz)::int AS instagram_sent,
        (SELECT COUNT(*) FROM public.outreach WHERE channel = 'LINKEDIN' AND status = 'SENT' AND sent_at >= '${from}'::timestamptz AND sent_at < '${to}'::timestamptz)::int AS linkedin_sent,
        (SELECT COUNT(*) FROM public.follow_ups WHERE status = 'COMPLETED' AND updated_at >= '${from}'::timestamptz AND updated_at < '${to}'::timestamptz)::int AS followups,
        (SELECT COUNT(*) FROM public.messages WHERE direction = 'INBOUND' AND created_at >= '${from}'::timestamptz AND created_at < '${to}'::timestamptz)::int AS inbound_messages,
        (SELECT COUNT(*) FROM public.messages WHERE direction = 'OUTBOUND' AND created_at >= '${from}'::timestamptz AND created_at < '${to}'::timestamptz)::int AS outbound_messages,
        (SELECT COUNT(*) FROM public.jobs WHERE status IN ('FAILED','RETRYING') AND created_at >= '${from}'::timestamptz AND created_at < '${to}'::timestamptz)::int AS problem_jobs,
        (SELECT COUNT(*) FROM public.campaigns WHERE status = 'RUNNING')::int AS running_campaigns`),
      db.$queryRawUnsafe<Array<{ stage: string; count: number }>>(`SELECT stage::text AS stage, COUNT(*)::int AS count FROM public.opportunities GROUP BY stage`),
      db.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT id, business_name, country, niche, audit_score, status::text AS status FROM public.leads WHERE audit_score IS NOT NULL ORDER BY audit_score DESC, updated_at DESC LIMIT 5`),
      db.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT id, type, message, created_at FROM public.activity_events WHERE created_at >= '${from}'::timestamptz AND created_at < '${to}'::timestamptz ORDER BY created_at DESC LIMIT 12`),
      getAutomationSettings(),
      db.$queryRawUnsafe<Array<Record<string, unknown>>>(`SELECT
        COUNT(*) FILTER (WHERE created_at >= '${from}'::timestamptz AND created_at < '${to}'::timestamptz)::int AS created,
        COUNT(*) FILTER (WHERE status = 'PUBLISHED' AND published_at >= '${from}'::timestamptz AND published_at < '${to}'::timestamptz)::int AS published,
        COUNT(*) FILTER (WHERE status = 'SCHEDULED' AND scheduled_at >= '${from}'::timestamptz AND scheduled_at < '${to}'::timestamptz)::int AS scheduled,
        COUNT(*) FILTER (WHERE status = 'FAILED' AND updated_at >= '${from}'::timestamptz AND updated_at < '${to}'::timestamptz)::int AS failed,
        COUNT(*) FILTER (WHERE platform = 'INSTAGRAM' AND status = 'PUBLISHED' AND published_at >= '${from}'::timestamptz AND published_at < '${to}'::timestamptz)::int AS instagram,
        COUNT(*) FILTER (WHERE platform = 'FACEBOOK' AND status = 'PUBLISHED' AND published_at >= '${from}'::timestamptz AND published_at < '${to}'::timestamptz)::int AS facebook,
        COUNT(*) FILTER (WHERE platform = 'LINKEDIN' AND status = 'PUBLISHED' AND published_at >= '${from}'::timestamptz AND published_at < '${to}'::timestamptz)::int AS linkedin,
        COUNT(*) FILTER (WHERE platform = 'YOUTUBE' AND status = 'PUBLISHED' AND published_at >= '${from}'::timestamptz AND published_at < '${to}'::timestamptz)::int AS youtube,
        COUNT(*) FILTER (WHERE platform = 'X' AND status = 'PUBLISHED' AND published_at >= '${from}'::timestamptz AND published_at < '${to}'::timestamptz)::int AS x
        FROM public.content_posts`),
    ]);
    const summary = summaryRows[0] ?? {}; const social = socialRows[0] ?? {};
    const stageMap = Object.fromEntries(stageRows.map((row) => [row.stage, int(row.count)]));
    const enabledMap = Object.fromEntries(automationSettings.map((setting) => [setting.key, setting.enabled]));
    const integrations = {
      database: 'CONNECTED', email: configured('RESEND_API_KEY') ? 'CONFIGURED' : 'CONFIG_REQUIRED',
      whatsapp: configured('OPENWA_BASE_URL') && configured('OPENWA_API_KEY') ? 'CONFIGURED' : configured('WHATSAPP_ACCESS_TOKEN') && configured('WHATSAPP_PHONE_NUMBER_ID') ? 'CONFIGURED' : 'CONFIG_REQUIRED',
      meta: configured('META_ACCESS_TOKEN') ? 'CONFIGURED' : 'CONFIG_REQUIRED', instagram: configured('META_ACCESS_TOKEN') && configured('META_INSTAGRAM_USER_ID') ? 'CONFIGURED' : 'CONFIG_REQUIRED', facebook: configured('META_ACCESS_TOKEN') ? 'CONFIGURED' : 'CONFIG_REQUIRED',
      linkedin: configured('LINKEDIN_ACCESS_TOKEN') ? 'CONFIGURED' : 'CONFIG_REQUIRED', youtube: configured('YOUTUBE_ACCESS_TOKEN') || configured('YOUTUBE_REFRESH_TOKEN') ? 'CONFIGURED' : 'CONFIG_REQUIRED', x: configured('X_ACCESS_TOKEN') ? 'CONFIGURED' : 'CONFIG_REQUIRED',
      leadDiscovery: configured('SERPER_API_KEY') || configured('GOOGLE_PLACES_API_KEY') || configured('SEARCH_PROVIDER') ? 'CONFIGURED' : 'CONFIG_REQUIRED', cron: configured('CRON_SECRET') ? 'CONFIGURED' : 'CONFIG_REQUIRED',
    };
    const rangeData = {
      totalLeads: int(summary.total_leads), qualified: int(summary.qualified_leads), outreachReady: int(summary.outreach_ready), replies: int(summary.inbound_messages), positiveReplies: int(summary.replied_leads), meetings: int(summary.meeting_leads), proposals: int(summary.proposal_leads), won: int(summary.won_leads), revenue: String(summary.won_revenue ?? '0'), sent: int(summary.sent), emailsSent: int(summary.email_sent), whatsappSent: int(summary.whatsapp_sent), instagramMessagesSent: int(summary.instagram_sent), linkedinMessagesSent: int(summary.linkedin_sent), outboundMessages: int(summary.outbound_messages), inboundMessages: int(summary.inbound_messages), followups: int(summary.followups), failedJobs: int(summary.problem_jobs), runningCampaigns: int(summary.running_campaigns),
    };
    const socialData = { created: int(social.created), published: int(social.published), scheduled: int(social.scheduled), failed: int(social.failed), instagram: int(social.instagram), facebook: int(social.facebook), linkedin: int(social.linkedin), youtube: int(social.youtube), x: int(social.x) };
    return NextResponse.json({ success: true, generatedAt: new Date().toISOString(), range: { from, to }, today: rangeData, summary: rangeData, social: socialData, pipeline: { open: int(stageMap.OPEN), qualified: int(stageMap.QUALIFIED), proposal: int(stageMap.PROPOSAL), won: int(stageMap.WON), lost: int(stageMap.LOST) }, hotLeads, activity: activityRows, integrations, automation: automationSettings, autopilot: { enabled: (enabledMap.master_autopilot ?? enabledMap.autopilot ?? true) && (enabledMap.outbound_enabled ?? true) } });
  } catch (error) {
    console.error('[FOUNDER OVERVIEW ERROR]', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Overview unavailable' }, { status: 500 });
  }
}
