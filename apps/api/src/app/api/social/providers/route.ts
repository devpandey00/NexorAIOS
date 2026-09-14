import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';

const graphVersion = process.env.META_GRAPH_VERSION?.trim() || 'v23.0';

async function jsonFetch(url: string, init: RequestInit = {}) {
  const response = await fetch(url, { ...init, cache: 'no-store', signal: AbortSignal.timeout(12_000) });
  const body = await response.json().catch(() => ({}));
  return { response, body };
}

function metaTokens() {
  return Array.from(new Set([
    process.env.META_ACCESS_TOKEN,
    process.env.META_PAGE_ACCESS_TOKEN,
    process.env.WHATSAPP_ACCESS_TOKEN,
  ].map((value) => value?.trim()).filter(Boolean) as string[]));
}

async function checkMeta() {
  const tokens = metaTokens();
  if (!tokens.length) return { configured: false, healthy: false, message: 'Meta token is not configured' };
  let last = 'Meta token could not be verified';
  for (const token of tokens) {
    try {
      const { response, body } = await jsonFetch(`https://graph.facebook.com/${graphVersion()}/me?fields=id,name&access_token=${encodeURIComponent(token)}`);
      if (response.ok && !body?.error) return { configured: true, healthy: true, message: `Meta authenticated${body?.name ? ` as ${String(body.name)}` : ''}` };
      last = body?.error?.message || `Meta returned HTTP ${response.status}`;
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
  }
  return { configured: true, healthy: false, message: last.toLowerCase().includes('invalid oauth access token') ? 'Meta access token is invalid or expired' : last };
}

async function checkFacebookPage() {
  const pageId = process.env.META_PAGE_ID?.trim();
  if (!pageId) return { configured: false, healthy: false, message: 'META_PAGE_ID is not configured' };
  const tokens = metaTokens();
  for (const token of tokens) {
    try {
      const { response, body } = await jsonFetch(`https://graph.facebook.com/${graphVersion()}/${pageId}?fields=id,name&access_token=${encodeURIComponent(token)}`);
      if (response.ok && !body?.error) return { configured: true, healthy: true, message: `Facebook Page connected${body?.name ? `: ${String(body.name)}` : ''}` };
    } catch {
      // Try the next configured Meta credential.
    }
  }
  return { configured: true, healthy: false, message: 'Facebook Page token/permissions are invalid. Reconnect the Page.' };
}

async function checkInstagram() {
  const accountId = process.env.META_INSTAGRAM_USER_ID?.trim() || process.env.META_INSTAGRAM_ACCOUNT_ID?.trim();
  if (!accountId || !metaTokens().length) return { configured: false, healthy: false, message: 'Instagram account ID or Meta token is not configured' };
  for (const token of metaTokens()) {
    try {
      const { response, body } = await jsonFetch(`https://graph.facebook.com/${graphVersion()}/${accountId}?fields=id,username&access_token=${encodeURIComponent(token)}`);
      if (response.ok && !body?.error) return { configured: true, healthy: true, message: `Instagram connected${body?.username ? `: @${String(body.username)}` : ''}` };
    } catch {
      // Try the next token.
    }
  }
  return { configured: true, healthy: false, message: 'Instagram token/account is invalid or missing publishing permissions' };
}

async function checkWhatsApp() {
  const token = (process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || process.env.META_PAGE_ACCESS_TOKEN)?.trim();
  const phoneNumberId = (process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.META_WHATSAPP_PHONE_NUMBER_ID)?.trim();
  if (!token || !phoneNumberId) return { configured: false, healthy: false, message: 'WhatsApp token or phone number ID is not configured' };
  try {
    const { response, body } = await jsonFetch(`https://graph.facebook.com/${graphVersion()}/${phoneNumberId}?fields=id,display_phone_number,verified_name&access_token=${encodeURIComponent(token)}`);
    if (response.ok && !body?.error) return { configured: true, healthy: true, message: `WhatsApp Cloud API connected${body?.verified_name ? `: ${String(body.verified_name)}` : ''}` };
    return { configured: true, healthy: false, message: body?.error?.message || `WhatsApp returned HTTP ${response.status}` };
  } catch (error) {
    return { configured: true, healthy: false, message: error instanceof Error ? error.message : String(error) };
  }
}

async function checkLinkedIn() {
  const token = process.env.LINKEDIN_ACCESS_TOKEN?.trim();
  const author = process.env.LINKEDIN_AUTHOR_URN?.trim();
  if (!token || !author) return { configured: false, healthy: false, message: 'LinkedIn access token or author URN is not configured' };
  try {
    const { response, body } = await jsonFetch('https://api.linkedin.com/v2/me', { headers: { Authorization: `Bearer ${token}` } });
    if (response.ok && !body?.error) return { configured: true, healthy: true, message: 'LinkedIn authenticated and ready to publish' };
    return { configured: true, healthy: false, message: response.status === 401 ? 'LinkedIn access token is invalid or expired' : (body?.message || `LinkedIn returned HTTP ${response.status}`) };
  } catch (error) {
    return { configured: true, healthy: false, message: error instanceof Error ? error.message : String(error) };
  }
}

async function checkX() {
  const token = process.env.X_ACCESS_TOKEN?.trim();
  if (!token) return { configured: false, healthy: false, message: 'X access token is not configured' };
  try {
    const { response, body } = await jsonFetch('https://api.x.com/2/users/me', { headers: { Authorization: `Bearer ${token}` } });
    if (response.ok && !body?.errors) return { configured: true, healthy: true, message: 'X authenticated and ready to publish' };
    return { configured: true, healthy: false, message: body?.detail || `X returned HTTP ${response.status}` };
  } catch (error) {
    return { configured: true, healthy: false, message: error instanceof Error ? error.message : String(error) };
  }
}

export async function GET(req: NextRequest) {
  if (!(await getSessionUser(req))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const [meta, facebook, instagram, whatsapp, linkedin, x] = await Promise.all([
    checkMeta(),
    checkFacebookPage(),
    checkInstagram(),
    checkWhatsApp(),
    checkLinkedIn(),
    checkX(),
  ]);
  return NextResponse.json({ success: true, providers: { META: meta, FACEBOOK: facebook, INSTAGRAM: instagram, WHATSAPP: whatsapp, LINKEDIN: linkedin, X: x } });
}
