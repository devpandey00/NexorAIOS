import { NextRequest, NextResponse } from 'next/server';
import { claimScheduledSocialContent, updateSocialContent } from '@/lib/social-content';
import { publishSocialPost } from '@/lib/social-publisher';
import { isAutomationEnabled, isOutboundEnabled } from '@/lib/automation-settings';

export const runtime = 'nodejs';
export const maxDuration = 120;

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  if (!(await isAutomationEnabled('social_publishing'))) return NextResponse.json({ success: true, skipped: true, reason: 'AUTOMATION_DISABLED', capability: 'social_publishing' });
  if (!(await isOutboundEnabled())) return NextResponse.json({ success: true, skipped: true, reason: 'OUTBOUND_PAUSED', capability: 'social_publishing' });

  try {
    const claimed = await claimScheduledSocialContent(20);
    const results: Array<{ id: string; success: boolean; error?: string }> = [];
    for (const post of claimed) {
      if (!(await isOutboundEnabled())) break;
      try {
        await publishSocialPost(post.id);
        results.push({ id: post.id, success: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await updateSocialContent(post.id, { status: 'FAILED', error: message }).catch(() => undefined);
        results.push({ id: post.id, success: false, error: message });
      }
    }
    return NextResponse.json({ success: true, due: claimed.length, results, outboundEnabled: await isOutboundEnabled() });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
