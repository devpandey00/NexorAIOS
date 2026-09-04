import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getDatabaseClients } from '@nexor/database';
import { ensureAiosPlatform, writeAudit } from '@/lib/aios-platform';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  await ensureAiosPlatform();
  const db = getDatabaseClients().read;
  const rows = await db.$queryRawUnsafe(`SELECT i.*, COALESCE((SELECT SUM(p.amount) FROM public.aios_payments p WHERE p.invoice_id=i.id AND p.status IN ('RECORDED','CONFIRMED')),0)::text AS paid_amount FROM public.aios_invoices i ORDER BY i.created_at DESC LIMIT 200`);
  return NextResponse.json({ success: true, invoices: rows });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    await ensureAiosPlatform();
    const body = await request.json();
    const items = Array.isArray(body.items) ? body.items : [];
    if (!String(body.clientName || '').trim()) throw new Error('clientName is required');
    if (!items.length) throw new Error('At least one invoice item is required');
    const db = getDatabaseClients().write;
    const subtotal = items.reduce((sum: number, item: any) => sum + Number(item.quantity ?? 1) * Number(item.unitPrice ?? 0), 0);
    const discount = Math.max(0, Number(body.discount ?? 0));
    const tax = Math.max(0, Number(body.tax ?? 0));
    const total = Math.max(0, subtotal - discount + tax);
    const number = String(body.invoiceNumber || `NX-${new Date().getFullYear()}-${Date.now().toString().slice(-8)}`);
    const invoiceRows = await db.$queryRawUnsafe<Array<{ id: string }>>(`INSERT INTO public.aios_invoices (invoice_number,client_name,client_email,opportunity_id,subtotal,discount,tax,total,currency,status,due_date,notes,created_by) VALUES ($1,$2,$3,$4::uuid,$5,$6,$7,$8,$9,'DRAFT',$10::timestamptz,$11,$12::uuid) RETURNING id`, number, String(body.clientName).trim(), body.clientEmail ? String(body.clientEmail) : null, body.opportunityId ? String(body.opportunityId) : null, subtotal, discount, tax, total, String(body.currency || 'INR'), body.dueDate ? String(body.dueDate) : null, body.notes ? String(body.notes) : null, user.id);
    const id = invoiceRows[0]?.id;
    for (const item of items) await db.$executeRawUnsafe(`INSERT INTO public.aios_invoice_items (invoice_id,description,quantity,unit_price,amount) VALUES ($1::uuid,$2,$3,$4,$5)`, id, String(item.description || 'Service'), Number(item.quantity ?? 1), Number(item.unitPrice ?? 0), Number(item.quantity ?? 1) * Number(item.unitPrice ?? 0));
    await writeAudit({ userId: user.id, action: 'INVOICE_CREATED', targetType: 'INVOICE', targetId: id, after: { number, total } });
    return NextResponse.json({ success: true, id, invoiceNumber: number, total, currency: body.currency || 'INR', status: 'DRAFT' }, { status: 201 });
  } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 }); }
}
