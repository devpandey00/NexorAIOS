import { NextResponse } from 'next/server';
import { getDatabaseClients } from '@nexor/database';

export const runtime = 'nodejs';

function configured(keys: string[]) {
  return keys.every((key) => Boolean(process.env[key]?.trim()));
}

export async function GET() {
  const integrations: Record<string, { status: 'OPERATIONAL' | 'NOT_CONFIGURED' | 'DEGRADED'; reason?: string }> = {
    search: { status: 'OPERATIONAL', reason: 'Built-in web search provider does not require an API key' },
    ai: configured(['OPENAI_API_KEY']) ? { status: 'OPERATIONAL' } : { status: 'NOT_CONFIGURED', reason: 'OPENAI_API_KEY is not configured' },
    whatsapp: configured(['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID']) ? { status: 'OPERATIONAL' } : { status: 'NOT_CONFIGURED', reason: 'WhatsApp credentials are not configured' },
    email: configured(['RESEND_API_KEY', 'OUTREACH_FROM_EMAIL']) ? { status: 'OPERATIONAL' } : { status: 'NOT_CONFIGURED', reason: 'Resend outreach credentials are not configured' },
    reportingEmail: configured(['RESEND_API_KEY', 'REPORT_FROM_EMAIL', 'REPORT_EMAIL_TO']) ? { status: 'OPERATIONAL' } : { status: 'NOT_CONFIGURED', reason: 'Report email credentials are not configured' },
    meta: configured(['META_ACCESS_TOKEN']) ? { status: 'OPERATIONAL' } : { status: 'NOT_CONFIGURED', reason: 'META_ACCESS_TOKEN is not configured' },
    googleAds: configured(['GOOGLE_ADS_DEVELOPER_TOKEN', 'GOOGLE_ADS_CLIENT_ID', 'GOOGLE_ADS_CLIENT_SECRET']) ? { status: 'OPERATIONAL' } : { status: 'NOT_CONFIGURED', reason: 'Google Ads credentials are not fully configured' },
  };

  try {
    const db = getDatabaseClients().write;
    await db.$queryRaw`SELECT 1`;
    integrations.database = { status: 'OPERATIONAL' };
  } catch (error) {
    integrations.database = { status: 'DEGRADED', reason: error instanceof Error ? error.message : String(error) };
  }

  return NextResponse.json({ success: true, generatedAt: new Date().toISOString(), integrations });
}
