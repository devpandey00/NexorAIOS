import { NextResponse } from 'next/server';
import { runCampaign } from '@/lib/campaign-runner';

export const maxDuration = 60;

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    const result = await runCampaign(id);

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[CAMPAIGN RUN ERROR]', error);

    // Discovery providers can temporarily return no usable results. Keep the API
    // request itself healthy and expose the actionable provider error to the UI
    // instead of turning a recoverable discovery miss into a 500 runtime error.
    return NextResponse.json(
      {
        success: false,
        retryable: true,
        error: message,
      },
      { status: 200 },
    );
  }
}
