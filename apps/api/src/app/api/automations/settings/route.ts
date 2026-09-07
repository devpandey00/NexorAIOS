import { NextRequest, NextResponse } from 'next/server';
import { getAutomationSettings, setAutomationSetting } from '@/lib/automation-settings';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';

async function authorized(request: NextRequest) {
  const user = await getSessionUser(request);
  return Boolean(user && user.role === 'ADMIN');
}

export async function GET(request: NextRequest) {
  if (!(await authorized(request))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    return NextResponse.json({ success: true, settings: await getAutomationSettings() });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await authorized(request))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    if (typeof body.key !== 'string' || typeof body.enabled !== 'boolean') {
      return NextResponse.json({ success: false, error: 'key and enabled are required' }, { status: 400 });
    }
    const setting = await setAutomationSetting(body.key, body.enabled);
    return NextResponse.json({ success: true, setting });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
