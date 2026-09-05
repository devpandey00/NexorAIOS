# Nexor + OpenWA

OpenWA is integrated as an optional WhatsApp Web transport for NexorAIOS.

## Important architecture

Do **not** run OpenWA inside the Vercel deployment. OpenWA owns a persistent WhatsApp Web session and a Chromium/browser process, so it needs a persistent Docker/VM host with durable storage. NexorAIOS on Vercel talks to that OpenWA instance over HTTPS.

Flow:

`NexorAIOS (Vercel) -> HTTPS -> OpenWA -> WhatsApp Web -> connected phone`

## Start OpenWA

On a persistent Linux VM/server with Docker:

```bash
cd infra/openwa
export OPENWA_API_MASTER_KEY='replace-with-a-long-random-key'
docker compose up -d
```

Expose port `2785` only behind HTTPS/reverse-proxy authentication. Never publish the OpenWA API publicly without TLS and a strong API key.

## Connect the WhatsApp account

Open the OpenWA dashboard, create a session (for example `nexor-sales`), start it, and scan the QR from WhatsApp > Linked Devices.

The OpenWA session must remain connected and its `/app/data` volume must persist across container restarts.

## Configure Vercel

Set these Production environment variables in the NexorAIOS Vercel project:

```text
OPENWA_BASE_URL=https://your-openwa-domain.example
OPENWA_API_KEY=your-openwa-api-key
OPENWA_SESSION_ID=<the OpenWA session UUID>
```

When all three are present, NexorAIOS automatically prefers OpenWA for WhatsApp outbound sends. If they are absent, the existing Meta Cloud API path remains available.

## Safety

Nexor still requires a lead to have a WhatsApp number and to pass its business-lead eligibility checks. Outreach must be approved before it can enter the send queue.

OpenWA is an unofficial WhatsApp Web gateway rather than Meta's official WhatsApp Business API. Follow WhatsApp's rules and use conservative, consent-aware outreach; OpenWA's own documentation warns against high-volume/identical cold messaging and notes that accounts can be restricted.
