import { NextResponse } from 'next/server';

import { getFacebookPage, getInstagramBusinessAccount, getMetaAccessToken } from '@/lib/social-publisher';
import { getWhatsAppProviderStatus } from '@/lib/outreach-sender';
import { getLinkedInAccessToken } from '@/lib/linkedin';

const graphVersion = process.env.META_GRAPH_VERSION?.trim() || 'v23.0';

export async function GET() {
  const metaToken = getMetaAccessToken();
  const metaConfigured = Boolean(metaToken);

  const facebook = { configured: metaConfigured, connected: false, reason: '' };
  const instagram = { configured: metaConfigured, connected: false, reason: '' };
  const whatsapp = getWhatsAppProviderStatus();
  const linkedinToken = getLinkedInAccessToken();
  const linkedin = { configured: Boolean(linkedinToken), connected: Boolean(linkedinToken), reason: linkedinToken ? '' : 'LinkedIn credentials are not configured.' };

  if (metaToken) {
    try {
      const page = await getFacebookPage();
      facebook.connected = Boolean(page?.id && page?.access_token);
      if (!facebook.connected) facebook.reason = 'No Facebook Page with a usable Page Access Token was found.';
    } catch (error) {
      facebook.reason = error instanceof Error ? error.message : 'Facebook connection check failed.';
    }

    try {
      const instagramAccount = await getInstagramBusinessAccount();
      instagram.connected = Boolean(instagramAccount?.id);
      if (!instagram.connected) instagram.reason = 'No Instagram Business account was found for the connected Facebook Page.';
    } catch (error) {
      instagram.reason = error instanceof Error ? error.message : 'Instagram connection check failed.';
    }
  } else {
    facebook.reason = 'Meta credentials are not configured.';
    instagram.reason = 'Meta credentials are not configured.';
  }

  return NextResponse.json({
    ok: true,
    checkedAt: new Date().toISOString(),
    graphVersion,
    providers: { facebook, instagram, whatsapp, linkedin },
  });
}
