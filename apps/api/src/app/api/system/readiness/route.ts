import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getDatabaseClients } from '@nexor/database';
import { getAutomationSettings } from '@/lib/automation-settings';

export const runtime = 'nodejs';

const groups = [
  { id: 'core', label: 'Core database', keys: ['DATABASE_URL'] },
  { id: 'ai', label: 'AI providers', keys: ['OPENAI_API_KEY', 'GEMINI_API_KEY', 'ANTHROPIC_API_KEY'] },
  { id: 'meta', label: 'Meta / Facebook / Instagram', keys: ['META_ACCESS_TOKEN|META_PAGE_ACCESS_TOKEN', 'META_APP_ID', 'META_APP_SECRET'] },
  { id: 'whatsapp', label: 'WhatsApp Cloud API', keys: ['WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN|META_ACCESS_TOKEN|META_PAGE_ACCESS_TOKEN'] },
  { id: 'email', label: 'Email delivery', keys: ['RESEND_API_KEY', 'OUTREACH_FROM_EMAIL'] },
  { id: 'search', label: 'Lead discovery / research', keys: ['SERPER_API_KEY'] },
  { id: 'linkedin', label: 'LinkedIn publishing', keys: ['LINKEDIN_ACCESS_TOKEN', 'LINKEDIN_AUTHOR_URN'] },
  { id: 'youtube', label: 'YouTube publishing', keys: ['YOUTUBE_ACCESS_TOKEN|YOUTUBE_REFRESH_TOKEN', 'YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET'] },
  { id: 'x', label: 'X publishing', keys: ['X_ACCESS_TOKEN'] },
  { id: 'google-ads', label: 'Google Ads', keys: ['GOOGLE_ADS_DEVELOPER_TOKEN', 'GOOGLE_ADS_CLIENT_ID', 'GOOGLE_ADS_CLIENT_SECRET', 'GOOGLE_ADS_REFRESH_TOKEN', 'GOOGLE_ADS_CUSTOMER_ID'] },
  { id: 'analytics', label: 'Analytics / Search Console', keys: ['GOOGLE_SERVICE_ACCOUNT_JSON|GOOGLE_ACCESS_TOKEN', 'GA4_PROPERTY_ID', 'SEARCH_CONSOLE_SITE_URL'] },
  { id: 'wordpress', label: 'WordPress', keys: ['WORDPRESS_URL', 'WORDPRESS_USERNAME', 'WORDPRESS_APP_PASSWORD'] },
] as const;

function groupState(keys: readonly string[]) {
  const missing = keys.filter((group) => !group.split('|').some((key) => Boolean(process.env[key])));
  return { configured: missing.length === 0, missing };
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  let database = false;
  try { await getDatabaseClients().read.$queryRaw`SELECT 1`; database = true; } catch { database = false; }
  const credentials = groups.map((group) => ({ ...group, ...groupState(group.keys) }));
  const automations = await getAutomationSettings();
  const enabled = automations.filter((item) => item.enabled).length;
  const blocked = automations.filter((item) => !item.enabled).length;

  return NextResponse.json({
    success: true,
    ready: database,
    database,
    credentials,
    automations: { enabled, blocked, total: automations.length, settings: automations },
    generatedAt: new Date().toISOString(),
  });
}
