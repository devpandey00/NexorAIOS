import { NEXOR_BRAND } from '@nexor/shared';
import { createSocialContent } from './social-content';

/**
 * The five-minute machine worker already has dedicated, bounded workers for
 * campaign discovery and approved outreach. The legacy /api/cron/autopilot
 * endpoint must therefore orchestrate only lightweight work; doing discovery,
 * research and opportunity scraping inline can exceed Vercel's function limit
 * and prevent the rest of the automation cycle from running.
 */
export async function runAutopilot() {
  const startedAt = Date.now();
  const socialDrafts: string[] = [];

  if (process.env.AUTOPILOT_SOCIAL_DRAFTS !== 'false') {
    for (const platform of ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN'] as const) {
      try {
        const post = await createSocialContent({
          platform,
          status: 'DRAFT',
          title: `${NEXOR_BRAND.name} ${platform} growth post`,
          caption: `Share one practical digital-growth insight for business owners, with a clear call to action and no invented claims. ${NEXOR_BRAND.name} helps businesses with ${NEXOR_BRAND.services.slice(0, 4).join(', ')}.`,
          hashtags: NEXOR_BRAND.defaultHashtags,
        });
        socialDrafts.push(post.id);
      } catch (error) {
        console.error(`[AUTOPILOT SOCIAL DRAFT ${platform}]`, error);
      }
    }
  }

  return {
    success: true,
    durationMs: Date.now() - startedAt,
    campaigns: [],
    socialDrafts,
    opportunities: { skipped: true, reason: 'Handled by dedicated discovery/sales-machine workers.' },
    opportunityDrafts: 0,
    note: 'Autopilot is orchestration-only. Campaign discovery, research and approved outreach run in dedicated bounded workers so one slow provider cannot block the whole five-minute cycle.',
  };
}
