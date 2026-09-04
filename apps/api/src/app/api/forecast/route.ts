import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getDatabaseClients } from '@nexor/database';
import { ensureAiosPlatform } from '@/lib/aios-platform';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    await ensureAiosPlatform();
    const db = getDatabaseClients().read;
    const rows = await db.$queryRawUnsafe<Array<{ stage: string; value: string | null }>>(`SELECT stage::text, COALESCE(SUM(value),0)::text AS value FROM public.opportunities GROUP BY stage`);
    const probabilities: Record<string, number> = { OPEN: 0.2, QUALIFIED: 0.4, PROPOSAL: 0.65, WON: 1, LOST: 0 };
    const pipeline = rows.reduce((sum, row) => sum + Number(row.value ?? 0) * (row.stage === 'WON' || row.stage === 'LOST' ? 1 : 1), 0);
    const weighted = rows.reduce((sum, row) => sum + Number(row.value ?? 0) * (probabilities[row.stage] ?? 0), 0);
    const won = rows.find(r => r.stage === 'WON');
    const invoices = await db.$queryRawUnsafe<Array<{ outstanding: string }>>(`SELECT COALESCE(SUM(total) FILTER (WHERE status IN ('SENT','OVERDUE','PARTIALLY_PAID')),0)::text AS outstanding FROM public.aios_invoices`);
    return NextResponse.json({ success: true, methodology: probabilities, pipelineValue: pipeline, weightedPipeline: weighted, wonRevenue: Number(won?.value ?? 0), outstandingInvoices: Number(invoices[0]?.outstanding ?? 0), expectedRevenue: weighted });
  } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 }); }
}
