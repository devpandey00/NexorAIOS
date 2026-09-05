# NexorAIOS + OpenWA

OpenWA is the WhatsApp Web gateway used by NexorAIOS for the optional self-hosted WhatsApp provider. It runs as a persistent service outside Vercel; NexorAIOS calls it over HTTPS.

## Architecture

Vercel/NexorAIOS -> HTTPS reverse proxy -> OpenWA -> WhatsApp linked device

Do not run OpenWA inside a Vercel function. OpenWA needs persistent session storage and a long-lived gateway process.

## Start OpenWA

On a VPS with Docker:

```bash
export OPENWA_API_MASTER_KEY='generate-a-long-random-secret'
docker compose -f docker/docker-compose.openwa.yml up -d
```

The bundled compose keeps OpenWA's port `2785` bound to `127.0.0.1`. Put a TLS reverse proxy such as Caddy, Nginx, or Traefik in front of it and expose only HTTPS to the internet, for example `https://wa.example.com`.

Do **not** expose port `2785` directly to the public internet. OpenWA supports API-key authentication, but the gateway still contains WhatsApp session state and should be isolated behind TLS and a firewall.

The OpenWA data volume stores the SQLite database, WhatsApp auth/session state, media and plugins. Back up this volume before upgrades.

## Link WhatsApp

Open the OpenWA dashboard, create a session, start it, and link an existing WhatsApp account with QR or phone-number pairing. Save the generated session UUID, not the session name.

For phone-number pairing, OpenWA expects digits-only international format (country code + number, with no `+`, spaces, or dashes). Wait for the session to reach `qr_ready` before requesting the pairing code.

## Connect NexorAIOS

Set these Vercel Production variables:

```text
OPENWA_BASE_URL=https://wa.example.com
OPENWA_API_KEY=<OpenWA operator key>
OPENWA_SESSION_ID=<OpenWA session UUID>
```

`OPENWA_BASE_URL` must be the gateway origin without `/api`; Nexor adds the API route itself.

For production, create a dedicated OpenWA `operator` key for Nexor instead of using the bootstrap admin key. Keep the admin key only for OpenWA administration.

## Sending flow

Nexor only sends WhatsApp outreach after the existing approval/state checks succeed. When all three OpenWA variables are configured, WhatsApp outbound messages use OpenWA first. If OpenWA is not configured, the existing Meta Cloud API path remains available.

OpenWA requests from Nexor have a bounded 15-second timeout so a dead gateway cannot hold an outreach worker indefinitely.

## Safety

OpenWA is an unofficial WhatsApp Web gateway. It is not the official Meta WhatsApp Cloud API. Use a dedicated business number, respect WhatsApp policies, rate-limit outreach, and do not use it for spam or bulk unsolicited messages.

## Verification

```bash
curl https://wa.example.com/api/health
curl -H "X-API-Key: $OPENWA_API_KEY" https://wa.example.com/api/sessions
```

A session must report a ready/connected state before Nexor can send through it.
