# WhatsApp template setup

Nexor now fails closed for Meta first-contact WhatsApp sending unless `WHATSAPP_TEMPLATE_NAME` is configured. This is intentional: WhatsApp Business Platform requires business-initiated conversations to use an approved Message Template, and recipients must have opted in to receive WhatsApp messages.

## Recommended marketing template

Create this in WhatsApp Manager and submit it for Meta approval:

- **Name:** `nexor_optin_intro_v1`
- **Category:** Marketing
- **Language:** English (US) / `en_US`
- **Body:**

  `Hi {{1}}, this is Diwakar from Nexor Media. I came across your business and have one quick growth idea that may help. If you'd like me to send it, reply YES. Reply STOP to opt out.`

The implementation sends one body parameter: the recipient's owner name when available, otherwise the business name. Do not add additional body placeholders unless the sender code is updated to provide them.

## Production variables

After Meta approves the template, configure these in Vercel Production:

```text
WHATSAPP_TEMPLATE_NAME=nexor_optin_intro_v1
WHATSAPP_TEMPLATE_LANGUAGE=en_US
WHATSAPP_APPROVAL_SECRET=<random-long-secret>
WHATSAPP_BATCH_SIZE=20
WHATSAPP_MIN_DELAY_MS=10000
RESEND_API_KEY=<resend-key>
REPORT_EMAIL_TO=<your-email>
```

`WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` remain required.

## Safety gate

A lead is eligible for automated WhatsApp sending only when:

1. the lead is international (India and unknown country are excluded);
2. a WhatsApp number exists;
3. `notes.metadata.whatsappOptIn` (or `whatsapp_opt_in`) is explicitly `true`;
4. the lead is an operational business rather than a job/content/listing lead;
5. the Meta template/provider is ready; and
6. the current batch has been explicitly approved through the emailed approval link.

Nexor sends at least 10 seconds apart, then stops after the approved batch of up to 20. A new batch requires another email approval.
