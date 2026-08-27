# NexorAIOS Toolkit

The toolkit is a development/self-hosting toolbox, not a second monolithic Nexor application.

## Classification

| Repository | Classification | Nexor use |
|---|---|---|
| `n8n-io/n8n` | OPTIONAL SERVICE | External workflow orchestration/integrations |
| `microsoft/playwright` | CORE TOOL | Browser automation and E2E only when HTTP is insufficient |
| `apify/crawlee` | OPTIONAL SERVICE / REFERENCE | Bounded crawling, retries and queue patterns |
| `twentyhq/twenty` | REFERENCE ONLY | CRM architecture; do not duplicate the CRM |
| `chatwoot/chatwoot` | OPTIONAL SERVICE | Conversation/inbox integration |
| `calcom/cal.com` | OPTIONAL SERVICE | Scheduling/booking |
| `PostHog/posthog` | OPTIONAL SERVICE | Product analytics/observability |
| `metabase/metabase` | OPTIONAL SERVICE | BI/reporting |
| `remotion-dev/remotion` | OPTIONAL SERVICE | Video generation when enabled |
| `knadh/listmonk` | OPTIONAL SERVICE | Email campaign/newsletter delivery |
| `devpandey00/Nexor-os` | REFERENCE ONLY | Nexor experiments/source reference |
| `devpandey00/devpandey00.github.io` | REFERENCE ONLY | Personal site/source reference |
| `devpandey00/yourname.github.io` | REFERENCE ONLY | Existing site/source reference |

## Core rule

NexorAIOS owns business data and state. PostgreSQL is the source of truth. Optional services may orchestrate or provide specialized capabilities, but Nexor must remain usable when they are unavailable.

## Lead discovery

Free-first routing is:

`DDG HTML -> DDG Lite -> Bing -> Google HTML -> optional SearXNG -> configured structured providers`

Structured paid providers are optional. Search failure returns diagnostics rather than a fake successful zero-result campaign.

Discovery candidates are normalized by domain and enriched with bounded concurrency. Search/crawl workloads are capped for the Vercel function budget.

## Automation

GitHub Actions runs the durable worker layer on a five-minute schedule. The worker calls authenticated Nexor endpoints for automatic discovery, scheduled automation, follow-ups, outreach and social publishing. Nexor persists automation runs and schedule state in PostgreSQL.

## Bootstrap

Run:

```bash
bash scripts/nexor-toolkit-setup.sh
```

This only clones/updates repositories. It does not start n8n, Chatwoot, Twenty, Cal.com, Metabase or any other external service.
