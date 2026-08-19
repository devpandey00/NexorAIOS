export async function verifyWhatsAppNumber(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(`https://wa.me/${digits}`, {
      redirect: 'manual',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store',
      signal: controller.signal,
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location') ?? '';
      return /whatsapp\.com/i.test(location);
    }
    if (response.ok) {
      const body = (await response.text()).slice(0, 12000).toLowerCase();
      return !/phone number.*invalid|not.*whatsapp|invalid.*number/.test(body);
    }
    return false;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendWhatsApp(to: string, message: string) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version = process.env.WHATSAPP_API_VERSION ?? 'v23.0';
  if (!token || !phoneNumberId) throw new Error('WhatsApp credentials are not configured');

  const recipient = to.replace(/\D/g, '');
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME;
  const templateLanguage = process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? 'en_US';
  const payload = templateName
    ? {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipient,
        type: 'template',
        template: {
          name: templateName,
          language: { code: templateLanguage },
          components: [{ type: 'body', parameters: [{ type: 'text', text: message.slice(0, 1024) }] }],
        },
      }
    : {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipient,
        type: 'text',
        text: { preview_url: false, body: message },
      };

  const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message ?? `WhatsApp send failed (${response.status})`);
  return data?.messages?.[0]?.id as string | undefined;
}
