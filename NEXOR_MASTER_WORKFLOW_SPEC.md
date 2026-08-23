# NexorAIOS — Master Workflow Specification

This is the canonical product scope for NexorAIOS. Do not treat it as a list of unrelated repos. Nexor remains the central UI, database, AI-agent layer and workflow system.

## Command Center
AI Command, Sales, Leads, CRM, Research, Outreach, WhatsApp, Email, Proposals, Meetings, Projects, Clients, Marketing, Ads, SEO, Social Media, Content, Video AI, Jobs, Automations, Analytics, Settings.

## Sales OS
Lead discovery -> dedupe -> website/SEO/ads/social research -> problem detection -> AI score -> personalized pitch -> CRM -> outreach -> follow-up -> meeting -> proposal -> deal.

Lead sources should support businesses, agencies, startups, coaches, restaurants, hotels, clinics, local businesses and companies hiring marketers. Filters: industry, location, company size, website, Instagram, Facebook, Google Business, ads, SEO score and contact availability.

## Research Agent
Company research returns company information, website, owner/founder, services, social profiles, SEO weaknesses, Google presence, Meta/Google ads, competitors, content weaknesses, conversion problems, opportunities, recommended service and personalized pitch; save the result to CRM.

## Outreach
Channels: email, WhatsApp, Instagram, LinkedIn, SMS. Generate initial message, follow-up 1/2/3 and breakup message. Track state, approvals, sends, replies and follow-ups in CRM.

## Unified Inbox
WhatsApp, email, Instagram, Facebook and website chat. AI summarizes, detects intent, suggests/drafts replies, updates CRM, creates tasks and schedules follow-ups.

## Proposals + Meetings
Generate professional proposal from client, services, pricing, problems, recommendations, timeline and deliverables; export PDF and track delivery. Meeting flow: booking -> calendar -> reminder -> AI briefing -> transcript -> summary -> action items -> CRM -> follow-up.

## Marketing OS
SEO: keyword research, rank tracking, site audit, technical SEO, content opportunities, competitor analysis. Ads: Google/Meta campaign planning, keyword clustering, ad/copy/creative generation, audience research, landing-page analysis, CPL/ROAS and conversion tracking.

## Content Factory
Topic -> blog -> LinkedIn -> Instagram caption -> carousel -> reel script -> YouTube script -> email -> ad copy. Design generation should be provider-backed where credentials exist.

## Video Factory
Prompt -> script -> scenes -> voice -> images/video -> captions -> brand template -> render -> export. Templates: Reel, Short, Ad, Product demo, Talking-head, Podcast clip, Quote video, Agency promo. Remotion is the preferred programmatic rendering architecture; provider APIs are used for external generation where configured.

## Website Auditor
URL -> performance -> SEO -> mobile -> accessibility -> UX -> conversion -> security headers -> forms -> broken links -> meta/schema -> analytics -> CTA -> AI audit + score + recommendations + pitch.

## Job OS
Find jobs -> filter -> read JD -> profile match -> AI score -> customize CV -> customize cover letter -> application -> tracker -> follow-up. Never claim a real application was submitted unless the external site/API confirms submission.

## Agency OS
Lead -> deal -> client -> project -> tasks -> deliverables -> invoices -> reports.

## Finance
Revenue, expenses, pending, paid, overdue, profit, client LTV, service revenue and MRR.

## Executive AI
Answer business-state questions from CRM/analytics: revenue, leads, qualification, meetings, proposals, closed deals, best/worst sources, pending money, overdue follow-ups and top opportunities.

## Automation Builder
WHEN -> IF -> THEN workflow graph with scheduled jobs, retries, approvals, webhooks and notifications. Prefer Nexor-native orchestration and external engines as adapters rather than copying complete products into the monorepo.

## Agent Layer
Sales Agent, Lead Research Agent, SEO Agent, Ads Agent, Content Agent, Social Media Agent, Video Agent, Website Auditor, Proposal Agent, Email Agent, CRM Agent, Job Agent, Analytics Agent and Executive Agent. Agents share CRM, memory, tools, browser, database, files and automations.

## Architecture Rules
Keep Nexor as the central product. Existing foundation: Next.js + TypeScript + Turborepo + Prisma + PostgreSQL + Docker + pnpm. Use external projects such as Twenty, Playwright, Crawlee, n8n, Chatwoot, Cal.com, PostHog, Metabase, Remotion and listmonk as architecture/integration references or separately deployed services; do not blindly merge whole repositories.

## Delivery Priority
1. Money: CRM, leads, research, scoring, outreach, WhatsApp/email, follow-ups, proposals, meetings.
2. Automation: browser agent, orchestration, agents, schedules, webhooks, notifications.
3. Agency: projects, clients, invoices, reports, SEO, Google Ads, Meta Ads, social.
4. Content: content factory, image generation, video generation, templates, scheduler.
5. Intelligence: analytics, BI, forecasting, lead prediction, executive AI, autonomous workflows.

## Production Rule
A workflow is marked LIVE only when its code path is implemented and the configured external provider/database confirms the operation. UI-only placeholders are marked READY FOR CONNECTION, not LIVE.
