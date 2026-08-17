import type { NexorReportSummary } from './email-reporting';

function cleanPhone(value: string) {
  return value.replace(/\D/g, '');
}

function reportText(summary: NexorReportSummary) {
  return [
    `NexorAIOS · ${summary.periodHours}h report`,
    `Leads: ${summary.leads} | Qualified: ${summary.qualifiedLeads}`,
    `Outreach: ${summary.sentOutreach} sent | ${summary.replies} replies`,
    `Meetings: ${summary.meetings} | Won: ${summary.won}`,
    `Social: ${summary.socialDrafts} drafts | ${summary.scheduledSocial} scheduled | ${summary.publishedSocial} published`,
    `Opportunities: ${summary.opportunities}`,
    `Scheduled outreach: ${summary.scheduledOutreach}`,
  ].join('\n');
}

export async function sendWhatsAppReport(summary: NexorReportSummary) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const to = cleanPhone(process.env.REPORT_WHATSAPP_TO?.trim() ?? '');
  const template = process.env.REPORT_WHATSAPP_TEMPLATE_NAME?.trim();
  const language = process.env.REPORT_WHATSAPP_TEMPLATE_LANGUAGE?.trim() || 'en_US';
  const version = process.env.WHATSAPP_API_VERSION?.trim() || 'v23.0';

  if (!token || !phoneNumberId || !to) {
    return { success: false, skipped: true, reason: 'WhatsApp reporting is not configured' };
  }

  const body = template
    ? {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: template,
          language: { code: language },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: String(summary.periodHours) },
                { type: 'text', text: String(summary.leads) },
                { type: 'text', text: String(summary.qualifiedLeads) },
                { type: 'text', text: String(summary.sentOutreach) },
                { type: 'text', text: String(summary.replies) },
                { type: 'text', text: String(summary.won) },
              ],
            },
          ],
        },
      }
    : {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: false, body: reportText(summary) },
      };

  const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message ?? `WhatsApp report failed (${response.status})`);
  }

  return { success: true, skipped: false, messageId: data?.messages?.[0]?.id ?? null };
}
