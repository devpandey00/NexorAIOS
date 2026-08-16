import { NextResponse } from 'next/server';

const configured = (name: string) => Boolean(process.env[name]);

export async function GET() {
  const integrations = {
    database: configured('DATABASE_URL'),
    whatsapp: configured('WHATSAPP_ACCESS_TOKEN') && configured('WHATSAPP_PHONE_NUMBER_ID'),
    email: configured('RESEND_API_KEY') && configured('OUTREACH_FROM_EMAIL'),
    metaAds: configured('META_ACCESS_TOKEN') && configured('META_AD_ACCOUNT_ID'),
    googleAds:
      configured('GOOGLE_ADS_DEVELOPER_TOKEN') &&
      configured('GOOGLE_ADS_CLIENT_ID') &&
      configured('GOOGLE_ADS_CLIENT_SECRET') &&
      configured('GOOGLE_ADS_REFRESH_TOKEN') &&
      configured('GOOGLE_ADS_CUSTOMER_ID'),
    analytics: configured('GOOGLE_SERVICE_ACCOUNT_JSON') && configured('GA4_PROPERTY_ID'),
    searchConsole: configured('GOOGLE_SERVICE_ACCOUNT_JSON') && configured('GSC_SITE_URL'),
    wordpress:
      configured('WORDPRESS_URL') &&
      configured('WORDPRESS_USERNAME') &&
      configured('WORDPRESS_APP_PASSWORD'),
    ai: configured('OPENAI_API_KEY') || configured('ANTHROPIC_API_KEY'),
  };

  const ready = Object.values(integrations).filter(Boolean).length;
  const total = Object.keys(integrations).length;

  return NextResponse.json({
    status: ready > 0 ? 'partial' : 'unconfigured',
    configured: ready,
    total,
    integrations,
    timestamp: new Date().toISOString(),
  });
}
