import { NextResponse } from 'next/server';
import { confirmManualOutreachSent } from '@/lib/outreach-sender';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  const { id } = await context.params;
  try {
    const result = await confirmManualOutreachSent(id);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
