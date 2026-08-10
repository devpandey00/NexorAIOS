import { NextRequest, NextResponse } from 'next/server';
import { campaignService } from '@nexor/core';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const query = typeof body.query === 'string' ? body.query.trim() : '';

    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: 'Query is required',
        },
        { status: 400 },
      );
    }

    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : query;

    const campaign = await campaignService.create({
      name,
      query,
    });

    const job = await campaignService.createDiscoveryJob(campaign.id);

    return NextResponse.json(
      {
        success: true,
        campaign,
        job,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[CAMPAIGN CREATE ERROR]', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
