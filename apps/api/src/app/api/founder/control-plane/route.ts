import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClients } from '@nexor/database';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';

const KEY = 'founder_control_plane';

export const CONTROL_DEFAULTS: Record<string, unknown> = {
  maintenance_mode: false, read_only_mode: false, debug_logging: false, verbose_activity: true, auto_refresh: true, health_polling_seconds: 30, timezone: 'Asia/Kolkata', default_range: 'today', compact_sidebar: false, show_advanced: true,
  max_concurrent_jobs: 5, max_daily_outbound: 250, approval_required: true, followup_delay_hours: 48, quiet_hours_start: '21:00', quiet_hours_end: '08:00', retry_failed_jobs: true, retry_limit: 3, pause_on_provider_error: true, social_auto_publish: false, whatsapp_auto_send: false, email_auto_send: false,
  whatsapp_session_id: '', default_message_channel: 'WHATSAPP', typing_delay_ms: 700, outbound_rate_limit_per_minute: 20, duplicate_protection: true, inbound_sync: true, message_retention_days: 365, media_max_mb: 16,
  default_social_platforms: ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN'], publish_window_start: '09:00', publish_window_end: '20:00', auto_hashtags: true, require_media_for_instagram: true, crosspost_enabled: false, social_approval_required: true,
  report_range: '7d', report_timezone: 'Asia/Kolkata', include_failures: true, include_provider_ids: true, export_format: 'CSV', email_reports: false, report_schedule: 'daily', realtime_dashboard: true,
  session_timeout_minutes: 1440, require_admin_for_integrations: true, audit_log: true, mask_secrets: true, confirmation_for_bulk_actions: true, ip_allowlist_mode: false, login_alerts: true, webhook_signature_check: true,
  animations: true, sound: false, notifications: true, dashboard_layout: 'executive', show_tool_descriptions: true, profile_badge_size: 'standard', show_system_health: true, show_live_counters: true,
};

async function authorized(request: NextRequest) {
  const user = await getSessionUser(request);
  return Boolean(user && user.role === 'ADMIN');
}

export async function GET(request: NextRequest) {
  if (!(await authorized(request))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const db = getDatabaseClients().read;
    const row = await db.automationSetting.findUnique({ where: { key: KEY } });
    const config = row?.config && typeof row.config === 'object' ? row.config as Record<string, unknown> : {};
    return NextResponse.json({ success: true, controls: { ...CONTROL_DEFAULTS, ...config } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await authorized(request))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const input = body?.controls && typeof body.controls === 'object' ? body.controls as Record<string, unknown> : body as Record<string, unknown>;
    const db = getDatabaseClients().write;
    const existing = await db.automationSetting.findUnique({ where: { key: KEY } });
    const previous = existing?.config && typeof existing.config === 'object' ? existing.config as Record<string, unknown> : {};
    const next = { ...CONTROL_DEFAULTS, ...previous } as Record<string, unknown>;
    for (const key of Object.keys(CONTROL_DEFAULTS)) {
      if (Object.prototype.hasOwnProperty.call(input, key)) next[key] = input[key];
    }

    // Keep this route independent of the app-level @prisma/client package.
    // The payload is JSON already, so this normalization produces a plain JSON object
    // that Prisma accepts for the Json field without importing Prisma types here.
    const jsonConfig = JSON.parse(JSON.stringify(next));
    const setting = await db.automationSetting.upsert({
      where: { key: KEY },
      create: { key: KEY, enabled: true, config: jsonConfig },
      update: { config: jsonConfig },
    });
    return NextResponse.json({ success: true, controls: setting.config });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}