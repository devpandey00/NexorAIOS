# NexorAIOS Autopilot

NexorAIOS is designed to discover prospects without requiring manual keyword entry.

## Autonomous cycle

1. Generate discovery plans from the campaign planner.
2. Create and run campaigns while deduplicating queries used in the previous 24 hours.
3. Research discovered leads and score them.
4. Verify WhatsApp numbers where available.
5. Create personalized outreach.
6. If WhatsApp production credentials are configured, auto-send is enabled by default unless `AUTOPILOT_AUTO_SEND_WHATSAPP=false`.
7. Generate social drafts.
8. Discover company, influencer and job opportunities.
9. Persist leads, research, outreach and reporting state in the database.

## Scheduling

Vercel Hobby cron runs the autopilot once per day. Higher-frequency execution requires a scheduler/plan that supports it; the application itself remains cloud-hosted and does not depend on the user's laptop.

## Required production configuration

- Database connection
- AI/search/research credentials
- `CRON_SECRET`
- WhatsApp credentials: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_NAME`
- `NEXT_PUBLIC_APP_URL` or `VERCEL_URL`
- `OUTREACH_API_SECRET` when required by the send endpoint
