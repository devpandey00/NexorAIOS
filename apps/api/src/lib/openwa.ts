function getConfig() {
  const baseUrl = process.env.OPENWA_BASE_URL?.trim().replace(/\/$/, '');
  const apiKey = process.env.OPENWA_API_KEY?.trim();
  const sessionId = process.env.OPENWA_SESSION_ID?.trim();
  return { baseUrl, apiKey, sessionId, configured: Boolean(baseUrl && apiKey && sessionId) };
}

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

export async function sendOpenWAText(to: string, text: string) {
  const { baseUrl, apiKey, sessionId } = getConfig();
  if (!baseUrl || !apiKey || !sessionId) {
    throw new Error('OpenWA is not configured: add OPENWA_BASE_URL, OPENWA_API_KEY and OPENWA_SESSION_ID in Vercel Production.');
  }

  const response = await fetch(`${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/messages/send-text`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ chatId: chatIdFromPhone(to), text }),
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const providerMessage = data?.message ?? data?.error ?? `OpenWA send failed (${response.status})`;
    throw new Error(String(providerMessage));
  }

  return (data?.messageId ?? data?.id ?? data?.message?.id) as string | undefined;
}
