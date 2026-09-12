function getConfig() {
  const baseUrl = process.env.OPENWA_BASE_URL?.trim().replace(/\/$/, '');
  const apiKey = process.env.OPENWA_API_KEY?.trim();
  const sessionId = process.env.OPENWA_SESSION_ID?.trim();
  return { baseUrl, apiKey, sessionId, configured: Boolean(baseUrl && apiKey && sessionId) };
}

const OPENWA_TIMEOUT_MS = 15_000;

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

async function openwaFetch(path: string, init: RequestInit = {}) {
  const { baseUrl, apiKey, sessionId } = getConfig();
  if (!baseUrl || !apiKey || !sessionId) {
    throw new Error('OpenWA is not configured: add OPENWA_BASE_URL, OPENWA_API_KEY and OPENWA_SESSION_ID in Vercel Production.');
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENWA_TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        'X-API-Key': apiKey,
        ...(init.headers ?? {}),
      },
      cache: 'no-store',
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const providerMessage = data?.message ?? data?.error ?? `OpenWA request failed (${response.status})`;
      throw new Error(String(providerMessage));
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

export async function getOpenWAConnectionStatus() {
  const { sessionId } = getConfig();
  if (!sessionId) throw new Error('OpenWA session ID is not configured.');
  const data = await openwaFetch(`/api/sessions/${encodeURIComponent(sessionId)}`);
  return {
    id: data?.id ?? sessionId,
    name: data?.name ?? null,
    status: data?.status ?? data?.state ?? 'unknown',
    ready: String(data?.status ?? data?.state ?? '').toLowerCase() === 'ready',
  };
}

export async function startOpenWASession() {
  const { sessionId } = getConfig();
  if (!sessionId) throw new Error('OpenWA session ID is not configured.');
  const data = await openwaFetch(`/api/sessions/${encodeURIComponent(sessionId)}/start`, { method: 'POST' });
  return {
    id: data?.id ?? sessionId,
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
  const { baseUrl, apiKey, sessionId } = getConfig();
  if (!baseUrl || !apiKey || !sessionId) {
    throw new Error('OpenWA is not configured: add OPENWA_BASE_URL, OPENWA_API_KEY and OPENWA_SESSION_ID in Vercel Production.');
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENWA_TIMEOUT_MS);
  const body: Record<string, unknown> = { chatId: chatIdFromPhone(to), url: mediaUrl };
  if (options.caption) body.caption = options.caption;
  if (options.filename) body.filename = options.filename;
  if (options.mimetype) body.mimetype = options.mimetype;
  try {
    const response = await fetch(`${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/messages/${MEDIA_ENDPOINT[kind]}`, {
      method: 'POST',
      headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const providerMessage = data?.message ?? data?.error ?? `OpenWA ${kind} send failed (${response.status})`;
      throw new Error(String(providerMessage));
    }
    return (data?.messageId ?? data?.id ?? data?.message?.id) as string | undefined;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`OpenWA request timed out after ${OPENWA_TIMEOUT_MS / 1000}s.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
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

export async function sendOpenWAText(to: string, text: string) {
  const { baseUrl, apiKey, sessionId } = getConfig();
  if (!baseUrl || !apiKey || !sessionId) {
    throw new Error('OpenWA is not configured: add OPENWA_BASE_URL, OPENWA_API_KEY and OPENWA_SESSION_ID in Vercel Production.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENWA_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/messages/send-text`, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chatId: chatIdFromPhone(to), text }),
      cache: 'no-store',
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const providerMessage = data?.message ?? data?.error ?? `OpenWA send failed (${response.status})`;
      throw new Error(String(providerMessage));
    }

    return (data?.messageId ?? data?.id ?? data?.message?.id) as string | undefined;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`OpenWA request timed out after ${OPENWA_TIMEOUT_MS / 1000}s.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
