import { NextRequest, NextResponse } from 'next/server';
import { claimScheduledSocialContent, updateSocialContent } from '@/lib/social-content';
import { publishSocialPost } from '@/lib/social-publisher';
import { isAutomationEnabled, isOutboundEnabled } from '@/lib/automation-settings';
import { authorizeMachineRequest } from '@/lib/machine-auth';

export const runtime = 'nodejs';
export const maxDuration = 120;

const MAX_AUTO_RETRIES = 3;
const RETRY_DELAY_MS = 30 * 60 * 1000;

function retryAttempt(error: string | null | undefined) {
  const match = error?.match(/\[AUTO_RETRY:(\d+)\/3\]/);
  return match ? Number(match[1]) : 0;
}

function isPermanentProviderError(message: string) {
  const value = message.toLowerCase();
  return [
    'not configured',
    'authentication',
    'unauthorized',
    'permission',
    'access token',
    'no facebook page',
    'requires a public mediaurl',
    'public mediaurl',
    'requires a public media',
    'credentials are not configured',
    'oauthexception',
  ].some((needle) => value.includes(needle));
}

export async function GET(req: NextRequest) {
  if (!(await authorizeMachineRequest(req))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  if (!(await isAutomationEnabled('social_publishing'))) return NextResponse.json({ success: true, skipped: true, reason: 'AUTOMATION_DISABLED', capability: 'social_publishing' });
  if (!(await isOutboundEnabled())) return NextResponse.json({ success: true, skipped: true, reason: 'OUTBOUND_PAUSED', capability: 'social_publishing' });

  try {
    const batchSize = Math.min(Math.max(Number(process.env.SOCIAL_PUBLISH_MAX_PER_RUN ?? 3), 1), 5);
    const staleBefore = new Date(Date.now() - 15 * 60 * 1000);
    const { getDatabaseClients } = await import('@nexor/database');
    const db = getDatabaseClients().write;

    // If a function died while publishing, make the post eligible for a fresh attempt.
    await db.$executeRaw`
      UPDATE public.content_posts
      SET status = 'SCHEDULED', error = COALESCE(error, 'Recovered stale publishing claim'), updated_at = CURRENT_TIMESTAMP
      WHERE status = 'PUBLISHING' AND updated_at < ${staleBefore}
    `;

    const claimed = await claimScheduledSocialContent(batchSize);
    const results: Array<{ id: string; success: boolean; error?: string; retryScheduled?: boolean }> = [];

    for (const post of claimed) {
      if (!(await isOutboundEnabled())) break;
      try {
        await publishSocialPost(post.id);
        results.push({ id: post.id, success: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const previousAttempt = retryAttempt(post.error);
        const nextAttempt = previousAttempt + 1;
        const retryable = !isPermanentProviderError(message) && nextAttempt <= MAX_AUTO_RETRIES;

        if (retryable) {
          await updateSocialContent(post.id, {
            status: 'SCHEDULED',
            scheduledAt: new Date(Date.now() + RETRY_DELAY_MS).toISOString(),
            error: `[AUTO_RETRY:${nextAttempt}/${MAX_AUTO_RETRIES}] ${message}`,
          }).catch(() => undefined);
          results.push({ id: post.id, success: false, error: message, retryScheduled: true });
        } else {
          await updateSocialContent(post.id, { status: 'FAILED', error: message }).catch(() => undefined);
          results.push({ id: post.id, success: false, error: message, retryScheduled: false });
        }
      }
    }

    return NextResponse.json({ success: true, due: claimed.length, batchSize, results, outboundEnabled: await isOutboundEnabled() });
  } catch (error) {
    console.error('[CRON SOCIAL PUBLISH ERROR]', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
