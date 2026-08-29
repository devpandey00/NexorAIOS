import { getDatabaseClients } from '@nexor/database';

export interface CommandCenterSummary {
  leads: number;
  qualified: number;
  replies: number;
  meetings: number;
  won: number;
  pendingDrafts: number;
  sent: number;
  campaigns: number;
}

export async function getCommandCenterSummary(): Promise<CommandCenterSummary> {
  const prisma = getDatabaseClients().write;
  const [leads, qualified, replies, meetings, won, pendingDrafts, sent, campaigns] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { status: 'QUALIFIED' } }),
    prisma.lead.count({ where: { status: 'REPLIED' } }),
    prisma.lead.count({ where: { status: 'MEETING_BOOKED' } }),
    prisma.lead.count({ where: { status: 'WON' } }),
    prisma.outreach.count({ where: { status: { in: ['DRAFT', 'APPROVAL_REQUIRED'] } } }),
    prisma.outreach.count({ where: { status: 'SENT' } }),
    prisma.campaign.count({ where: { status: 'RUNNING' } }),
  ]);
  return { leads, qualified, replies, meetings, won, pendingDrafts, sent, campaigns };
}
