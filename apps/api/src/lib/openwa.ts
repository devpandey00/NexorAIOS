function getConfig() {
  const baseUrl = process.env.OPENWA_BASE_URL?.trim().replace(/\/$/, '');
  const apiKey = process.env.OPENWA_API_KEY?.trim();
  const sessionId = process.env.OPENWA_SESSION_ID?.trim();
  return { baseUrl, apiKey, sessionId, configured: Boolean(baseUrl && apiKey && sessionId) };
}

const OPENWA_TIMEOUT_MS = 15_000;

type OpenWASession = { id?: string; name?: string; status?: string; state?: string };

export function getOpenWAStatus() {
  const config = getConfig();
  return {
    configured: config.configured,
    baseUrlConfigured: Boolean(config.baseUrl),
    apiKeyConfigured: Boolean(config.apiKey),
    sessionConfigured: Boolean(config.sessionId),
  };
}

function chatIdFromPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits || digits.length < 8) throw new Error('Lead WhatsApp number is invalid after normalization.');
  return `${digits}@c.us`;
}

async function openwaFetch(path: string, init: RequestInit = {}, requireSession = true) {
  const { baseUrl, apiKey, sessionId } = getConfig();
  if (!baseUrl || !apiKey || (requireSession && !sessionId)) {
    throw new Error('OpenWA is not configured: add OPENWA_BASE_URL, OPENWA_API_KEY and OPENWA_SESSION_ID in Vercel Production.');
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENWA_TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'X-API-Key': apiKey,
        'Authorization': `Bearer ${apiKey}`,
        ...(init.headers ?? {}),
      },
      cache: 'no-store',
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const providerMessage = data?.message ?? data?.error ?? `OpenWA request failed (${response.status})`;
      throw new Error(`OpenWA ${response.status}: ${String(providerMessage)}`);
    }
    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`OpenWA request timed out after ${OPENWA_TIMEOUT_MS / 1000}s.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveSessionId() {
  const { sessionId } = getConfig();
  if (!sessionId) throw new Error('OpenWA session ID is not configured.');
  try {
    const sessions = await openwaFetch('/api/sessions', {}, false) as OpenWASession[];
    const match = Array.isArray(sessions)
      ? sessions.find((session) => String(session?.id ?? '') === sessionId || String(session?.name ?? '') === sessionId)
      : null;
    if (match?.id) return match.id;
    if (Array.isArray(sessions) && sessions.length === 0) {
      throw new Error(`OpenWA has no sessions. Create/start a session in OpenWA, then set OPENWA_SESSION_ID to its UUID or name.`);
    }
    const available = Array.isArray(sessions)
      ? sessions.map((session) => `${session?.name ?? 'unnamed'} (${session?.id ?? 'no-id'})`).join(', ')
      : 'none';
    throw new Error(`OpenWA session "${sessionId}" was not found. Available sessions: ${available || 'none'}.`);
  } catch (error) {
    if (error instanceof Error && error.message.includes('OpenWA session')) throw error;
    return sessionId;
  }
}

export async function getOpenWAConnectionStatus() {
  const resolvedSessionId = await resolveSessionId();
  const data = await openwaFetch(`/api/sessions/${encodeURIComponent(resolvedSessionId)}`);
  return {
    id: data?.id ?? resolvedSessionId,
    name: data?.name ?? null,
    status: data?.status ?? data?.state ?? 'unknown',
    ready: String(data?.status ?? data?.state ?? '').toLowerCase() === 'ready',
  };
}

export async function startOpenWASession() {
  const resolvedSessionId = await resolveSessionId();
  const data = await openwaFetch(`/api/sessions/${encodeURIComponent(resolvedSessionId)}/start`, { method: 'POST' });
  return {
    id: data?.id ?? resolvedSessionId,
    status: data?.status ?? data?.state ?? 'starting',
    ready: String(data?.status ?? data?.state ?? '').toLowerCase() === 'ready',
  };
}

type OpenWAMediaKind = 'image' | 'video' | 'audio' | 'document';

const MEDIA_ENDPOINT: Record<OpenWAMediaKind, string> = {
  image: 'send-image',
  video: 'send-video',
  audio: 'send-audio',
  document: 'send-document',
};

async function sendOpenWAMedia(kind: OpenWAMediaKind, to: string, mediaUrl: string, options: { caption?: string; filename?: string; mimetype?: string } = {}) {
  const resolvedSessionId = await resolveSessionId();
  const body: Record<string, unknown> = { chatId: chatIdFromPhone(to), url: mediaUrl };
  if (options.caption) body.caption = options.caption;
  if (options.filename) body.filename = options.filename;
  if (options.mimetype) body.mimetype = options.mimetype;
  const data = await openwaFetch(`/api/sessions/${encodeURIComponent(resolvedSessionId)}/messages/${MEDIA_ENDPOINT[kind]}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (data?.messageId ?? data?.id ?? data?.message?.id) as string | undefined;
}

export async function sendOpenWAImage(to: string, mediaUrl: string, caption?: string) {
  return sendOpenWAMedia('image', to, mediaUrl, { caption });
}
export async function sendOpenWAVideo(to: string, mediaUrl: string, caption?: string) {
  return sendOpenWAMedia('video', to, mediaUrl, { caption });
}
export async function sendOpenWAAudio(to: string, mediaUrl: string) {
  return sendOpenWAMedia('audio', to, mediaUrl);
}
export async function sendOpenWADocument(to: string, mediaUrl: string, filename: string, options: { caption?: string; mimetype?: string } = {}) {
  return sendOpenWAMedia('document', to, mediaUrl, { ...options, filename });
}

async function sendMetaTemplateFallback(to: string, text: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME?.trim();
  const templateLanguage = process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || 'en_US';
  if (!token || !phoneNumberId || !templateName) return undefined;
  const recipient = to.replace(/\D/g, '');
  if (!recipient || recipient.length < 8) throw new Error('Lead WhatsApp number is invalid after normalization.');
  const parameterText = text.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  if (!parameterText) throw new Error('WhatsApp template parameter is empty.');
  const version = process.env.WHATSAPP_API_VERSION?.trim() || 'v23.0';
  const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient,
      type: 'template',
      template: {
        name: templateName,
        language: { code: templateLanguage },
        components: [{ type: 'body', parameters: [{ type: 'text', text: parameterText }] }],
      },
    }),
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const providerMessage = data?.error?.message ?? `Meta WhatsApp fallback failed (${response.status})`;
    const providerCode = Number(data?.error?.code ?? 0);
    throw new Error(providerCode ? `${providerMessage} [Meta ${providerCode}]` : providerMessage);
  }
  return data?.messages?.[0]?.id as string | undefined;
}

export async function sendOpenWAText(to: string, text: string) {
  try {
    const resolvedSessionId = await resolveSessionId();
    const data = await openwaFetch(`/api/sessions/${encodeURIComponent(resolvedSessionId)}/messages/send-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: chatIdFromPhone(to), text }),
    });
    return (data?.messageId ?? data?.id ?? data?.message?.id) as string | undefined;
  } catch (openwaError) {
    const fallbackMessageId = await sendMetaTemplateFallback(to, text);
    if (fallbackMessageId) return fallbackMessageId;
    throw openwaError;
  }
}
