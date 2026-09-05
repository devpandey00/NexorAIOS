import { NextRequest, NextResponse } from 'next/server';
import { campaignService } from '@nexor/core';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';

async function authorized(req: NextRequest) {
  const secret = process.env.OUTREACH_API_SECRET?.trim();
  if (secret && req.headers.get('authorization') === `Bearer ${secret}`) return true;
  return Boolean(await getSessionUser(req));
}

// Production-safe campaign creation: enqueue discovery after the campaign exists.
export async function POST(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const query = typeof body.query === 'string' ? body.query.trim() : '';

    if (!query) {
      return NextResponse.json({ success: false, error: 'Query is required' }, { status: 400 });
    }

    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : query;
    const campaign = await campaignService.create({ name, query });
    const job = await campaignService.createDiscoveryJob(campaign.id);

    return NextResponse.json({ success: true, executionStatus: 'started', campaign, job }, { status: 201 });
  } catch (error) {
    console.error('[CAMPAIGN CREATE ERROR]', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
