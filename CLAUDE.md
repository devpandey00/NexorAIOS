# NexorAIOS — execution contract

You are working on NexorAIOS, an enterprise digital-marketing AI operating system. Do not confuse this repository with any hotel, PayU, or unrelated project.

## Immediate objective
Get the repository into a working, deployable MVP first, then implement the missing digital-marketing modules. Work directly in the repository. Do not stop at analysis or give the user a list of hypothetical changes.

## Non-negotiable workflow
1. Inspect the existing monorepo before changing architecture.
2. Run/repair `pnpm install`, Prisma generation, typecheck, lint, tests, and `pnpm build`.
3. Fix the first real blocker, rerun validation, then continue until green.
4. Never hide errors with `any`, `@ts-ignore`, `@ts-nocheck`, disabled lint rules, or fake success responses.
5. Preserve working functionality. Prefer small composable services and adapters.
6. Never commit secrets. Update `.env.example` when a new credential is required.
7. Every external integration must have a provider interface, configuration validation, error handling, and a mock/testable path.
8. Every destructive or externally sending action must be explicit/approved unless the existing product design clearly marks it autonomous.
9. Keep database writes idempotent where possible.
10. After meaningful changes, run the narrowest relevant checks and finish with the full build.

## Current working capabilities to preserve
- Next.js API routes
- Prisma/database package
- lead discovery/search
- website research
- lead scoring/intelligence
- campaign runner
- personalized WhatsApp/email outreach drafts
- outreach approval flow
- WhatsApp Cloud API sending
- Resend email sending
- conversations/messages/follow-ups
- social profile discovery
- cron/autonomous campaign execution where already present

## Product scope
Build toward a single dashboard that manages the full digital-marketing lifecycle:

### 1. Lead generation + CRM
- Search/discover businesses
- Website research and audit
- lead scoring
- deduplication
- CRM pipeline/stages
- notes, tasks, tags
- contact enrichment
- import/export CSV
- campaign membership
- activity timeline

### 2. AI sales/outreach
- personalized WhatsApp drafts/sending
- email drafts/sending
- follow-up sequences
- approval queue
- conversation history
- reply classification
- lead intent/sentiment
- next-best-action
- templates and variables
- provider failures/retries/rate limits

### 3. Meta ecosystem
Implement adapters/services for Meta Graph API where credentials and permissions permit:
- Facebook Page management
- Instagram Business account management
- content publishing/scheduling
- comments/engagement where supported
- Meta Ads account/campaign/ad-set/ad CRUD
- campaign metrics, spend, CPM, CPC, CTR, CPL, conversions/ROAS where available
- audience/creative metadata
- reporting dashboards
Do not pretend an endpoint is implemented if it is not. Mark unsupported permissions explicitly.

### 4. Google ecosystem
Implement adapters/services for:
- Google Ads campaign/ad-group/ad management
- keyword/search-term reporting
- spend, clicks, impressions, CPC, CTR, conversions, CPA, ROAS
- GA4 reporting
- Google Search Console queries/pages/clicks/impressions/CTR/position
- Google Business Profile/local SEO integration if API access is available
Use OAuth/service-account flows appropriately; never hard-code tokens.

### 5. SMM/content
- content calendar
- AI caption generation
- platform-specific variants
- hashtag suggestions
- image/creative brief generation
- scheduling queue
- publishing adapters
- post status/error tracking
- analytics aggregation

### 6. Website development
- website/project records
- reusable website templates
- page/section/content models
- SEO metadata
- landing-page generation
- form/lead capture
- deployment adapter architecture
- WordPress integration where credentials are supplied
- audit/performance/SEO checks
Do not build a fake website deployment API. Use real provider APIs or clearly isolated adapters.

### 7. Marketing intelligence/reporting
- unified KPI dashboard
- campaign comparison
- channel attribution fields
- client reports
- PDF/CSV export if the current stack supports it
- AI executive summary
- anomaly detection
- recommendations

### 8. Security/operations
- validate environment variables at startup/request boundary
- protect internal/admin routes
- webhook signature verification
- provider rate limits and retries
- structured logging
- health/readiness endpoint
- safe error messages
- no credentials in logs

## Priority order
P0: green build + working local/prod boot + database + health endpoint.
P1: lead discovery → research → score → campaign → WhatsApp/email draft → approval → send → follow-up.
P2: Meta + Google Ads/analytics adapters and reporting.
P3: SMM content calendar/publishing/analytics.
P4: website builder/deployment/WordPress.
P5: advanced AI automation, reporting, optimization, anomaly detection.

## Definition of done
The project is not “done” because TypeScript compiles. For each module:
- API route/service exists
- validation exists
- database model exists if persistence is needed
- provider adapter exists for real external actions
- UI is wired if a UI already exists
- loading/error/empty states exist
- tests cover core transformations and failure paths
- environment variables are documented
- build/typecheck/lint/tests pass

## If credentials are missing
Implement the integration architecture and mock/test adapter, document exactly which credential/permission is required, and keep the rest of the application runnable. Do not fabricate provider responses.

## Final response format after a work session
Report only:
- what changed
- what is verified green
- what remains blocked and the exact credential/permission needed
- the next highest-value implementation step
