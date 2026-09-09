import { NextRequest, NextResponse } from 'next/server';
import { authorizeMachineRequest } from '@/lib/machine-auth';
import { isAutomationEnabled, isOutboundEnabled } from '@/lib/automation-settings';
import { createSocialContent, listSocialContent, type SocialContentPlatform } from '@/lib/social-content';
import { isProviderConfigured } from '@/lib/social-publisher';

export const runtime = 'nodejs';
export const maxDuration = 30;

const TEXT_PLATFORMS: SocialContentPlatform[] = ['FACEBOOK', 'LINKEDIN', 'X'];
const DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;

function buildPost(platform: SocialContentPlatform) {
  const title = 'Stop guessing where your leads are coming from';
  const caption = [
    'Your marketing should not depend on random posting, scattered spreadsheets, or manual follow-ups.',
    'NexorAIOS connects lead discovery, research, CRM, outreach, follow-ups, and social execution into one operating system.',
    'If your business is generating attention but not enough qualified conversations, the problem is usually the system behind the marketing — not just the ad or the post.',
    'Follow Nexor for practical growth systems, automation, and AI workflows built for real businesses.',
  ].join('\n\n');
  const hashtags = ['#NexorAIOS', '#DigitalMarketing', '#LeadGeneration', '#MarketingAutomation', '#AI'];
  return { platform, title, caption, hashtags };
}

export async function GET(req: NextRequest) {
  if (!(await authorizeMachineRequest(req))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  if (!(await isAutomationEnabled('social_publishing'))) {
    return NextResponse.json({ success: true, skipped: true, reason: 'AUTOMATION_DISABLED', capability: 'social_publishing' });
  }
  if (!(await isOutboundEnabled())) {
    return NextResponse.json({ success: true, skipped: true, reason: 'OUTBOUND_PAUSED', capability: 'social_publishing' });
  }

  try {
    const now = Date.now();
    const generated: Array<{ id: string; platform: SocialContentPlatform }> = [];
    const skipped: Array<{ platform: SocialContentPlatform; reason: string }> = [];

    for (const platform of TEXT_PLATFORMS) {
      if (!isProviderConfigured(platform)) {
        skipped.push({ platform, reason: 'PROVIDER_NOT_CONFIGURED' });
        continue;
      }

      const recent = await listSocialContent({ platform, limit: 20 });
      const hasRecentPost = recent.some((post) => now - new Date(post.createdAt).getTime() < DAILY_WINDOW_MS);
      if (hasRecentPost) {
        skipped.push({ platform, reason: 'RECENT_POST_EXISTS' });
        continue;
      }

      const post = await createSocialContent({
        ...buildPost(platform),
        status: 'SCHEDULED',
        scheduledAt: new Date(Date.now() - 1000).toISOString(),
      });
      generated.push({ id: post.id, platform });
    }

    return NextResponse.json({
      success: true,
      generated,
      skipped,
      note: 'Text-only providers are auto-scheduled. Instagram/YouTube require media assets and are not fabricated by this worker.',
    });
  } catch (error) {
    console.error('[CRON SOCIAL AUTOPILOT ERROR]', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
