import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getDatabaseClients } from '@nexor/database';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const db = getDatabaseClients().read;
  const [leads, opportunities, activities, followUps] = await Promise.all([
    db.lead.findMany({ orderBy: { updatedAt: 'desc' }, take: 100 }),
    db.opportunity.findMany({ include: { lead: true }, orderBy: { updatedAt: 'desc' }, take: 100 }),
    db.activityEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
    db.followUp.findMany({ where: { status: { in: ['PENDING','SCHEDULED'] } }, orderBy: { scheduledAt: 'asc' }, take: 100 }),
  ]);
  return NextResponse.json({ success: true, pipeline: { leads, opportunities }, activities, followUps });
}
