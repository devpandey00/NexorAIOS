import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getAutomationSettings, setAutomationSetting } from '@/lib/automation-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function authorized(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;
  return Boolean(await getSessionUser(req));
}

export async function GET(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ success: true, settings: await getAutomationSettings() });
}

export async function PATCH(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const updates = Array.isArray(body?.settings)
      ? body.settings.filter((item: unknown): item is { key: string; enabled: boolean } => Boolean(item) && typeof item === 'object' && typeof (item as { key?: unknown }).key === 'string' && typeof (item as { enabled?: unknown }).enabled === 'boolean')
      : typeof body?.key === 'string' && typeof body?.enabled === 'boolean'
        ? [{ key: body.key, enabled: body.enabled }]
        : [];
    if (!updates.length) return NextResponse.json({ success: false, error: 'Provide key + enabled or a settings array' }, { status: 400 });
    for (const update of updates) await setAutomationSetting(update.key, update.enabled);
    return NextResponse.json({ success: true, settings: await getAutomationSettings() });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
