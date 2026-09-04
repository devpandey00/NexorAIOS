import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { runGrowthTool, queueGrowthApproval, type GrowthToolAction } from '@/lib/growth-tools';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const action = String(body.action || '').toUpperCase() as GrowthToolAction;
    if (!action) return NextResponse.json({ success: false, error: 'action is required' }, { status: 400 });
    const result = await runGrowthTool(action, (body.input ?? {}) as Record<string, unknown>, user.id);
    const approval = ['OUTREACH','PROPOSAL','INVOICE_REMINDER','PAYMENT_FOLLOWUP'].includes(action)
      ? await queueGrowthApproval(`GROWTH_${action}`, result, user.id)
      : null;
    return NextResponse.json({ success: true, action, result, approvalRequired: Boolean(approval), approvalId: approval });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
