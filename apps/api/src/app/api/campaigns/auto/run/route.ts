import { NextRequest, NextResponse } from 'next/server';
import { campaignService } from '@nexor/core';
import { campaignPlannerService } from '@nexor/search';
import { runCampaign } from '@/lib/campaign-runner';

export const runtime = 'nodejs';
export const maxDuration = 300;

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Hourly rotation means every scheduled run gets a different search combination.
    const rotationIndex = Math.floor(Date.now() / (60 * 60 * 1000));
    const plan = campaignPlannerService.plan(rotationIndex);

    const campaign = await campaignService.create({
      name: `Auto ${plan.industry} — ${plan.location} — ${plan.service}`,
      query: plan.query,
    });

    const result = await runCampaign(campaign.id);

    return NextResponse.json({
      success: true,
      plan,
      result,
    });
  } catch (error) {
    console.error('[AUTO CAMPAIGN ERROR]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
