# NexorAIOS + Scrapling lead discovery

Scrapling is integrated as a persistent lead-discovery worker. NexorAIOS remains on Vercel; the browser/scraping workload runs on a VPS or local Docker host.

## Architecture

Vercel/NexorAIOS -> HTTPS/private network -> Scrapling worker -> public business websites/search pages -> Nexor lead CRM -> approved outreach

Scrapling is used for public-business discovery and enrichment. It does not send messages itself.

## Start locally / on a VPS

```bash
export SCRAPLING_WORKER_API_KEY='generate-a-long-random-secret'
docker compose -f docker/docker-compose.yml up -d
docker compose -f docker/docker-compose.scrapling.yml up -d --build
```

The worker listens on `127.0.0.1:8787` by default. For production, put it behind a private network or HTTPS reverse proxy rather than exposing port 8787 publicly.

## Connect Nexor

Set these Vercel Production variables:

```text
SCRAPLING_WORKER_URL=https://scrape.example.com
SCRAPLING_WORKER_API_KEY=<same random secret>
```

Do not put the worker API key in client-side code.

## Lead flow

The `/api/discovery/scrapling` endpoint generates international-only discovery queries, calls the worker, filters out India locations, enriches public business websites for business email/social/WhatsApp links, de-duplicates against the Nexor CRM, and saves the resulting leads.

Default targets are Dubai/UAE, UK, USA, Canada and Australia. India is explicitly excluded by the route.

## Outreach safety

Only use public business contact details, respect applicable privacy/data-protection rules and website terms, and keep Nexor's existing approval/state checks before any outbound message. Scrapling is a scraper, not a license to spam.
