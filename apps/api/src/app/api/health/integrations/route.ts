import { NextResponse } from 'next/server';
import { getDatabaseClients } from '@nexor/database';
import { checkGA4Connection } from '@/lib/integrations/ga4';
import { checkSearchConsoleConnection } from '@/lib/integrations/search-console';

export const runtime = 'nodejs';

type IntegrationName =
  | 'database'
  | 'whatsapp'
  | 'email'
  | 'openai'
  | 'anthropic'
  | 'search'
  | 'meta'
  | 'meta-ads'
  | 'google-ads'
  | 'wordpress'
  | 'ga4'
  | 'search-console';

type IntegrationStatus = {
  name: IntegrationName;
  status: string;
  configured: number;
  required: number;
  missing: string[];
  verified: boolean;
};

const integrations: readonly [IntegrationName, readonly string[]][] = [
  ['whatsapp', ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID']],
  ['email', ['RESEND_API_KEY', 'OUTREACH_FROM_EMAIL']],
  ['openai', ['OPENAI_API_KEY']],
  ['anthropic', ['ANTHROPIC_API_KEY']],
  ['search', ['SERPER_API_KEY']],
  ['meta', ['META_ACCESS_TOKEN', 'META_APP_ID', 'META_APP_SECRET']],
  ['meta-ads', ['META_ACCESS_TOKEN', 'META_AD_ACCOUNT_ID']],
  ['google-ads', ['GOOGLE_ADS_DEVELOPER_TOKEN', 'GOOGLE_ADS_CLIENT_ID', 'GOOGLE_ADS_CLIENT_SECRET', 'GOOGLE_ADS_REFRESH_TOKEN', 'GOOGLE_ADS_CUSTOMER_ID']],
  ['wordpress', ['WORDPRESS_URL', 'WORDPRESS_USERNAME', 'WORDPRESS_APP_PASSWORD']],
];

function configuredStatus(required: readonly string[]): IntegrationStatus['status'] {
  const configured = required.filter((key) => Boolean(process.env[key]));
  return configured.length === required.length ? 'CONFIGURED' : configured.length > 0 ? 'PARTIAL' : 'CONFIGURATION_REQUIRED';
}

function envStatus(name: IntegrationName, required: readonly string[]): IntegrationStatus {
  const configured = required.filter((key) => Boolean(process.env[key]));
  return {
    name,
    status: configuredStatus(required),
    configured: configured.length,
    required: required.length,
    missing: required.filter((key) => !process.env[key]),
    verified: false,
  };
}

function providerStatus(name: IntegrationName, result: Record<string, unknown>, required: string[]): IntegrationStatus {
  const status = typeof result.status === 'string' ? result.status : 'ERROR';
  return {
    name,
    status: status === 'CONNECTED' ? 'CONNECTED' : status === 'ERROR' ? 'ERROR' : 'CONFIGURATION_REQUIRED',
    configured: status === 'CONNECTED' ? required.length : 0,
    required: required.length,
    missing: status === 'CONNECTED' ? [] : required,
    verified: true,
  };
}

export async function GET() {
  const status: IntegrationStatus[] = [];

  try {
    await getDatabaseClients().read.$queryRaw`SELECT 1`;
    status.push({ name: 'database', status: 'CONNECTED', configured: 1, required: 1, missing: [], verified: true });
  } catch {
    status.push({
      name: 'database',
      status: 'ERROR',
      configured: Number(Boolean(process.env.DATABASE_URL)),
      required: 1,
      missing: process.env.DATABASE_URL ? [] : ['DATABASE_URL'],
      verified: true,
    });
  }

  status.push(...integrations.map(([name, required]) => envStatus(name, required)));

  let ga4: Record<string, unknown>;
  try {
    ga4 = await checkGA4Connection();
  } catch (error) {
    ga4 = { status: 'ERROR', error: error instanceof Error ? error.message : String(error) };
  }

  let searchConsole: Record<string, unknown>;
  try {
    searchConsole = await checkSearchConsoleConnection();
  } catch (error) {
    searchConsole = { status: 'ERROR', error: error instanceof Error ? error.message : String(error) };
  }

  status.push(providerStatus('ga4', ga4, ['GOOGLE_SERVICE_ACCOUNT_JSON/GOOGLE_ACCESS_TOKEN', 'GA4_PROPERTY_ID']));
  status.push(providerStatus('search-console', searchConsole, ['GOOGLE_SERVICE_ACCOUNT_JSON/GOOGLE_ACCESS_TOKEN', 'SEARCH_CONSOLE_SITE_URL']));

  const connected = status.filter((item) => item.status === 'CONNECTED').length;
  const configured = status.filter((item) => item.status === 'CONFIGURED').length;
  const partial = status.filter((item) => item.status === 'PARTIAL').length;
  const errors = status.filter((item) => item.status === 'ERROR').length;

  return NextResponse.json({
    success: errors === 0,
    status: errors > 0 ? 'error' : connected > 0 ? 'ready' : configured > 0 || partial > 0 ? 'configured' : 'unconfigured',
    connected,
    configured,
    partial,
    errors,
    total: status.length,
    integrations: status,
    generatedAt: new Date().toISOString(),
  });
}
