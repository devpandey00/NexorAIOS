import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, error: 'Manual autopilot is disabled in production; the scheduled autopilot runs automatically.' },
      { status: 403 },
    );
  }

  try {
    const { runAutopilot } = await import('@/lib/autopilot-runner');
    return NextResponse.json(await runAutopilot());
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
