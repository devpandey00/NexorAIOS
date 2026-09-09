import { NextRequest, NextResponse } from 'next/server';
import { authorizeMachineRequest } from '@/lib/machine-auth';
import { isAutomationEnabled, isOutboundEnabled } from '@/lib/automation-settings';
import { createSocialContent, listSocialContent, updateSocialContent, type SocialContentPlatform } from '@/lib/social-content';
import { isProviderConfigured } from '@/lib/social-publisher';

export const runtime = 'nodejs';
export const maxDuration = 30;

const TEXT_PLATFORMS: SocialContentPlatform[] = ['FACEBOOK', 'LINKEDIN', 'X'];
const DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;
const FAILED_RECOVERY_DELAY_MS = 15 * 60 * 1000;

const DAILY_POSTS = [
  {
    title: 'Your leads are not the problem. Your system is.',
    caption: 'If leads are coming in but sales still feel inconsistent, the bottleneck is often the system behind the marketing. NexorAIOS connects discovery, research, CRM, outreach, follow-ups, and reporting so your team can move from scattered activity to a repeatable growth engine.',
    hashtags: ['#NexorAIOS', '#LeadGeneration', '#SalesAutomation', '#MarketingAutomation', '#AI'],
  },
  {
    title: 'Stop losing leads between tools.',
    caption: 'A lead should not disappear because it moved from an ad platform to a spreadsheet, then to a CRM, then into someone’s inbox. NexorAIOS is built around one operating loop: discover, understand, contact, follow up, and measure the result.',
    hashtags: ['#NexorAIOS', '#CRM', '#LeadManagement', '#BusinessAutomation', '#Growth'],
  },
  {
    title: 'More activity does not always mean more growth.',
    caption: 'Posting more, sending more messages, and collecting more leads means very little if the workflow cannot prioritize the right opportunities. The goal is not more noise. The goal is a system that turns qualified opportunities into conversations and measurable outcomes.',
    hashtags: ['#NexorAIOS', '#GrowthMarketing', '#SalesOS', '#Automation', '#AI'],
  },
  {
    title: 'Research before you pitch.',
    caption: 'Generic outreach gets ignored. Better outreach starts with context: website weaknesses, SEO gaps, ads, social activity, positioning, and the business problem behind the opportunity. NexorAIOS is designed to turn that research into a relevant sales conversation.',
    hashtags: ['#NexorAIOS', '#SalesIntelligence', '#LeadResearch', '#B2BMarketing', '#AI'],
  },
  {
    title: 'Follow-up should be a system, not a memory.',
    caption: 'A good lead can go cold simply because nobody followed up at the right time. NexorAIOS keeps outreach, follow-ups, conversations, and CRM state connected so opportunities do not depend on someone remembering what to do next.',
    hashtags: ['#NexorAIOS', '#FollowUp', '#SalesAutomation', '#CRM', '#RevenueOperations'],
  },
  {
    title: 'Your marketing should create a feedback loop.',
    caption: 'Discovery creates leads. Research creates context. Outreach creates conversations. CRM records the outcome. Reporting tells you what worked. That feedback loop is what turns marketing automation into an operating system instead of another collection of tools.',
    hashtags: ['#NexorAIOS', '#MarketingOS', '#RevenueGrowth', '#Automation', '#DigitalMarketing'],
  },
  {
    title: 'Build once. Let the system keep moving.',
    caption: 'The real value of automation is not one impressive demo. It is the boring consistency: scheduled workers running, content being published, follow-ups being queued, outreach being processed, and results being recorded without someone clicking Run every morning.',
    hashtags: ['#NexorAIOS', '#Autopilot', '#BusinessAutomation', '#AIWorkflows', '#GrowthSystems'],
  },
] as const;

function buildPost(platform: SocialContentPlatform) {
  const dayIndex = Math.floor(Date.now() / DAILY_WINDOW_MS) % DAILY_POSTS.length;
  const post = DAILY_POSTS[dayIndex];
  return {
    platform,
    title: `${post.title} — ${platform}`,
    caption: post.caption,
    hashtags: [...post.hashtags],
  };
}

function isRecoverableFailure(error: string | null) {
  if (!error) return false;
  const value = error.toLowerCase();
  return value.includes('[auto_retry:') || ![
    'not configured',
    'authentication',
    'unauthorized',
    'permission',
    'access token',
    'no facebook page',
    'requires a public mediaurl',
    'public mediaurl',
    'oauthexception',
  ].some((needle) => value.includes(needle));
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
    const recovered: Array<{ id: string; platform: SocialContentPlatform }> = [];
    const skipped: Array<{ platform: SocialContentPlatform; reason: string }> = [];

    for (const platform of TEXT_PLATFORMS) {
      if (!isProviderConfigured(platform)) {
        skipped.push({ platform, reason: 'PROVIDER_NOT_CONFIGURED' });
        continue;
      }

      const recent = await listSocialContent({ platform, limit: 50 });
      const activePost = recent.find((post) => ['SCHEDULED', 'PUBLISHING'].includes(post.status));
      const publishedRecently = recent.some((post) => post.status === 'PUBLISHED' && now - new Date(post.createdAt).getTime() < DAILY_WINDOW_MS);

      if (activePost) {
        skipped.push({ platform, reason: 'ACTIVE_POST_EXISTS' });
        continue;
      }
      if (publishedRecently) {
        skipped.push({ platform, reason: 'RECENT_PUBLISHED_POST_EXISTS' });
        continue;
      }

      const latestFailed = recent.find((post) => post.status === 'FAILED');
      if (latestFailed) {
        const failedAt = new Date(latestFailed.updatedAt).getTime();
        if (now - failedAt < FAILED_RECOVERY_DELAY_MS) {
          skipped.push({ platform, reason: 'RECENT_FAILURE_BACKOFF' });
          continue;
        }
        if (isRecoverableFailure(latestFailed.error)) {
          await updateSocialContent(latestFailed.id, {
            status: 'SCHEDULED',
            scheduledAt: new Date(Date.now() + 1000).toISOString(),
            error: latestFailed.error,
          });
          recovered.push({ id: latestFailed.id, platform });
          continue;
        }
        skipped.push({ platform, reason: 'PERMANENT_PROVIDER_FAILURE' });
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
      recovered,
      skipped,
      note: 'Configured text providers are automatically scheduled once per day. Transient failures are retried up to three times; permanent provider/auth failures are held until configuration is fixed.',
    });
  } catch (error) {
    console.error('[CRON SOCIAL AUTOPILOT ERROR]', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
