import { NextRequest, NextResponse } from 'next/server';
import { campaignService } from '@nexor/core';
import { runCampaign } from '@/lib/campaign-runner';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = typeof body.query === 'string' ? body.query.trim() : '';

    if (!query) {
      return NextResponse.json({ success: false, error: 'Query is required' }, { status: 400 });
    }

    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : query;
    const campaign = await campaignService.create({ name, query });
    const job = await campaignService.createDiscoveryJob(campaign.id);

    let result: unknown = null;
    let executionStatus: 'started' | 'completed' | 'failed' = 'started';
    try {
      result = await runCampaign(campaign.id);
      executionStatus = 'completed';
    } catch (error) {
      executionStatus = 'failed';
      result = { error: error instanceof Error ? error.message : String(error) };
    }

    return NextResponse.json({
      success: executionStatus !== 'failed',
      executionStatus,
      campaign: {
        ...campaign,
        status: executionStatus === 'completed' ? 'COMPLETED' : executionStatus === 'failed' ? 'FAILED' : campaign.status,
      },
      job,
      result,
    }, { status: executionStatus === 'failed' ? 502 : 201 });
  } catch (error) {
    console.error('[CAMPAIGN CREATE ERROR]', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
