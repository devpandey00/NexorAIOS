import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const integrations = [
  ['database', ['DATABASE_URL']],
  ['whatsapp', ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID']],
  ['email', ['RESEND_API_KEY', 'OUTREACH_FROM_EMAIL']],
  ['openai', ['OPENAI_API_KEY']],
  ['anthropic', ['ANTHROPIC_API_KEY']],
  ['search', ['SERPER_API_KEY']],
  ['meta', ['META_ACCESS_TOKEN', 'META_APP_ID', 'META_APP_SECRET']],
  ['meta-ads', ['META_ACCESS_TOKEN', 'META_AD_ACCOUNT_ID']],
  ['google-ads', ['GOOGLE_ADS_DEVELOPER_TOKEN', 'GOOGLE_ADS_CLIENT_ID', 'GOOGLE_ADS_CLIENT_SECRET', 'GOOGLE_ADS_REFRESH_TOKEN', 'GOOGLE_ADS_CUSTOMER_ID']],
  ['ga4', ['GOOGLE_SERVICE_ACCOUNT_JSON', 'GA4_PROPERTY_ID']],
  ['search-console', ['GOOGLE_SERVICE_ACCOUNT_JSON', 'GSC_SITE_URL']],
  ['wordpress', ['WORDPRESS_URL', 'WORDPRESS_USERNAME', 'WORDPRESS_APP_PASSWORD']],
] as const;

export async function GET() {
  const status = integrations.map(([name, required]) => {
    const configured = required.filter((key) => Boolean(process.env[key]));
    return {
      name,
      status:
        configured.length === required.length
          ? 'CONNECTED'
          : configured.length > 0
            ? 'PARTIAL'
            : 'NOT_CONFIGURED',
      configured: configured.length,
      required: required.length,
      missing: required.filter((key) => !process.env[key]),
    };
  });

  const connected = status.filter((item) => item.status === 'CONNECTED').length;
  const partial = status.filter((item) => item.status === 'PARTIAL').length;

  return NextResponse.json({
    success: true,
    status: connected > 0 ? (partial > 0 ? 'partial' : 'ready') : 'unconfigured',
    connected,
    partial,
    total: status.length,
    integrations: status,
    generatedAt: new Date().toISOString(),
  });
}
