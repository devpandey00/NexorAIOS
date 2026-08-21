import { NextRequest, NextResponse } from 'next/server';
import { checkGA4Connection, runGA4Report } from '@/lib/integrations/ga4';

function authorized(req: NextRequest) {
  const secret = process.env.OUTREACH_API_SECRET || process.env.CRON_SECRET;
  return !secret || req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const params = req.nextUrl.searchParams;
    const connection = await checkGA4Connection();
    if (connection.status !== 'CONNECTED') return NextResponse.json({ success: true, integration: connection, report: null });
    const report = await runGA4Report({ startDate: params.get('startDate') || undefined, endDate: params.get('endDate') || undefined });
    return NextResponse.json({ success: true, integration: connection, report });
  } catch (error) {
    return NextResponse.json({ success: false, status: 'ERROR', error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
