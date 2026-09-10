import { NEXOR_BRAND } from '@nexor/shared';
import { createSocialContent } from './social-content';
import { isAutomationEnabled } from './automation-settings';

/** Lightweight daily orchestration. Heavy discovery and outbound work stays in bounded workers. */
export async function runAutopilot() {
  const startedAt = Date.now();
  const socialDrafts: string[] = [];
  const socialScheduled: string[] = [];
  const publishingEnabled = await isAutomationEnabled('social_publishing');

  if (process.env.AUTOPILOT_SOCIAL_DRAFTS !== 'false') {
    for (const platform of ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN'] as const) {
      try {
        const canAutoPublish = platform === 'FACEBOOK' && publishingEnabled && Boolean(process.env.META_ACCESS_TOKEN);
        const post = await createSocialContent({
          platform,
          status: canAutoPublish ? 'SCHEDULED' : 'DRAFT',
          scheduledAt: canAutoPublish ? new Date(Date.now() + 30 * 60 * 1000).toISOString() : null,
          title: `${NEXOR_BRAND.name} ${platform} growth post`,
          caption: `One practical digital-growth insight for business owners, with a clear call to action and no invented claims. ${NEXOR_BRAND.name} helps businesses with ${NEXOR_BRAND.services.slice(0, 4).join(', ')}.`,
          hashtags: NEXOR_BRAND.defaultHashtags,
        });
        if (canAutoPublish) socialScheduled.push(post.id); else socialDrafts.push(post.id);
      } catch (error) {
        console.error(`[AUTOPILOT SOCIAL ${platform}]`, error);
      }
    }
  }

  return {
    success: true,
    durationMs: Date.now() - startedAt,
    campaigns: [],
    socialDrafts,
    socialScheduled,
    opportunities: { skipped: true, reason: 'Handled by dedicated discovery/sales-machine workers.' },
    opportunityDrafts: 0,
    note: 'Autopilot orchestrates bounded workers. Connected Facebook posts are scheduled automatically; platforms requiring media or unavailable credentials remain drafts instead of being falsely marked published.',
  };
}
