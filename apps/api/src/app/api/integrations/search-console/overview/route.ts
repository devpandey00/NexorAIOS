import { NextRequest, NextResponse } from 'next/server';
import { checkSearchConsoleConnection, runSearchConsoleReport } from '@/lib/integrations/search-console';

function authorized(req: NextRequest) {
  const secret = process.env.OUTREACH_API_SECRET || process.env.CRON_SECRET;
  return !secret || req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const params = req.nextUrl.searchParams;
    const connection = await checkSearchConsoleConnection();
    if (connection.status !== 'CONNECTED') return NextResponse.json({ success: true, integration: connection, report: null });
    const dimension = params.get('dimension');
    const report = await runSearchConsoleReport({ startDate: params.get('startDate') || undefined, endDate: params.get('endDate') || undefined, dimensions: dimension ? dimension.split(',').filter(Boolean) : undefined });
    return NextResponse.json({ success: true, integration: connection, report });
  } catch (error) {
    return NextResponse.json({ success: false, status: 'ERROR', error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
