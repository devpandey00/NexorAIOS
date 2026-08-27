# NexorAIOS Toolkit Integration Plan

This document defines the intended optional integration boundary for external open-source projects. External repositories must not be copied wholesale into the NexorAIOS monorepo.

## Priority

### Core developer/tooling
- Microsoft Playwright: browser automation and end-to-end tests.
- Apify Crawlee: bounded crawling and extraction where the existing crawler is insufficient.

### Optional self-hosted services
- n8n: workflow orchestration and third-party integration automation.
- Twenty: CRM capability reference/optional service.
- Chatwoot: conversations/inbox reference or optional service.
- Cal.com: scheduling/booking integration.
- PostHog: product analytics and funnel observability.
- Remotion: automated video generation.
- listmonk: optional bulk email/newsletter service.
- Metabase: optional BI/reporting service.

## Free-first campaign architecture

Campaign -> query generation -> free search router -> business URLs -> crawler -> normalization -> dedupe -> lead scoring -> PostgreSQL -> campaign association -> outreach drafts -> configured channel execution -> follow-up -> CRM -> reporting.

Search provider order:
1. DuckDuckGo HTML
2. Bing HTML fallback
3. SearXNG when `SEARXNG_URL` is configured
4. Serper / Google Places only when explicitly configured

Paid providers must never be required for core discovery.

## Integration boundary

NexorAIOS remains the source of truth for business state and PostgreSQL records. External services are adapters/providers and may be unavailable without taking down the core application.

Do not add external repository source trees to the production application bundle. Prefer npm packages, stable HTTP APIs, Docker services, or well-defined adapters.
