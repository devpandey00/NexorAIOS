import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getDatabaseClients } from '@nexor/database';
import { ensureAiosPlatform, writeAudit } from '@/lib/aios-platform';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    await ensureAiosPlatform();
    const body = await request.json();
    const invoiceId = String(body.invoiceId || '');
    const amount = Number(body.amount);
    if (!invoiceId || !Number.isFinite(amount) || amount <= 0) throw new Error('invoiceId and positive amount are required');
    const db = getDatabaseClients().write;
    const rows = await db.$queryRawUnsafe<Array<{ total: string; paid: string }>>(`SELECT i.total::text, COALESCE((SELECT SUM(p.amount) FROM public.aios_payments p WHERE p.invoice_id=i.id AND p.status IN ('RECORDED','CONFIRMED')),0)::text AS paid FROM public.aios_invoices i WHERE i.id=$1::uuid`, invoiceId);
    if (!rows[0]) throw new Error('Invoice not found');
    if (amount > Number(rows[0].total) - Number(rows[0].paid) + 0.01) throw new Error('Payment exceeds outstanding invoice balance');
    await db.$executeRawUnsafe(`INSERT INTO public.aios_payments (invoice_id,amount,method,reference,status,paid_at,created_by) VALUES ($1::uuid,$2,$3,$4,'RECORDED',now(),$5::uuid)`, invoiceId, amount, body.method ? String(body.method) : 'MANUAL', body.reference ? String(body.reference) : null, user.id);
    const newPaid = Number(rows[0].paid) + amount;
    const status = newPaid + 0.01 >= Number(rows[0].total) ? 'PAID' : 'PARTIALLY_PAID';
    await db.$executeRawUnsafe(`UPDATE public.aios_invoices SET status=$1, updated_at=now() WHERE id=$2::uuid`, status, invoiceId);
    await writeAudit({ userId: user.id, action: 'PAYMENT_RECORDED', targetType: 'INVOICE', targetId: invoiceId, after: { amount, status }, success: true });
    return NextResponse.json({ success: true, invoiceId, amount, status, paidAmount: newPaid, outstanding: Math.max(0, Number(rows[0].total) - newPaid) });
  } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 }); }
}
