import { NextResponse } from 'next/server';
import { getDatabaseClients } from '@nexor/database';

export const runtime = 'nodejs';

const prisma = getDatabaseClients().write;

export async function GET() {
  try {
    const [
      leads,
      qualified,
      contacted,
      replied,
      meetings,
      won,
      pendingDrafts,
      scheduled,
      sent,
      failed,
      openConversations,
      pendingFollowUps,
      openTasks,
      campaigns,
      recentActivity,
    ] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { status: 'QUALIFIED' } }),
      prisma.lead.count({ where: { status: 'CONTACTED' } }),
      prisma.lead.count({ where: { status: 'REPLIED' } }),
      prisma.lead.count({ where: { status: 'MEETING_BOOKED' } }),
      prisma.lead.count({ where: { status: 'WON' } }),
      prisma.outreach.count({ where: { status: { in: ['DRAFT', 'APPROVAL_REQUIRED'] } } }),
      prisma.outreach.count({ where: { status: 'SCHEDULED' } }),
      prisma.outreach.count({ where: { status: 'SENT' } }),
      prisma.outreach.count({ where: { status: 'FAILED' } }),
      prisma.conversation.count({ where: { status: 'OPEN' } }),
      prisma.followUp.count({ where: { status: 'PENDING' } }),
      prisma.task.count({ where: { status: { in: ['TODO', 'IN_PROGRESS'] } } }),
      prisma.campaign.count(),
      prisma.activityEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 12,
        select: { id: true, type: true, message: true, metadata: true, createdAt: true, campaignId: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      metrics: {
        leads,
        qualified,
        contacted,
        replied,
        meetings,
        won,
        pendingDrafts,
        scheduled,
        sent,
        failed,
        openConversations,
        pendingFollowUps,
        openTasks,
        campaigns,
      },
      recentActivity,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[DASHBOARD SUMMARY ERROR]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
