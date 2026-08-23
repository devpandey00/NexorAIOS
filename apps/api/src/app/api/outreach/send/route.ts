import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { sendApprovedOutreach } from '@/lib/outreach-sender';

export const runtime = 'nodejs';

async function authorized(req: NextRequest) {
  const secret = process.env.OUTREACH_API_SECRET?.trim();
  if (secret && req.headers.get('authorization') === `Bearer ${secret}`) return true;
  return Boolean(await getSessionUser(req));
}

export async function POST(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const id = typeof body?.id === 'string' ? body.id.trim() : '';
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    const result = await sendApprovedOutreach(id);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
