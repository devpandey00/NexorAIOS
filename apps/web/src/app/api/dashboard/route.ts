import { NextResponse } from 'next/server';
import { getDatabaseClients } from '@nexor/database/client';

export async function GET() {
  try {
    const { read } = getDatabaseClients();
    const [leads, campaigns, jobs, outreach, followUps, tasks, recentLeads] = await Promise.all([
      read.lead.count(),
      read.campaign.count(),
      read.job.count(),
      read.outreach.count(),
      read.followUp.count({ where: { status: 'PENDING' } }),
      read.task.count({ where: { status: { not: 'COMPLETED' } } }),
      read.lead.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: { id: true, businessName: true, niche: true, country: true, status: true, auditScore: true, createdAt: true },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      metrics: { leads, campaigns, jobs, outreach, pendingFollowUps: followUps, openTasks: tasks },
      recentLeads,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[dashboard] failed to load metrics', error);
    return NextResponse.json({ ok: false, error: 'Dashboard data is unavailable' }, { status: 503 });
  }
}
