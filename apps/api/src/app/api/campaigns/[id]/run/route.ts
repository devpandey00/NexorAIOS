import { NextResponse } from 'next/server';
import { runCampaign } from '@/lib/campaign-runner';

export const maxDuration = 60;

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const result = await runCampaign(id);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[CAMPAIGN RUN ERROR]', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
