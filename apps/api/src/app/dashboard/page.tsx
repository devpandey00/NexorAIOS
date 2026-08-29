import DashboardLayout from '@/components/dashboard/DashboardLayout';
import NexorCommandCenter from '@/components/dashboard/NexorCommandCenter';
import { getDatabaseClients, LeadStatus, OutreachStatus, CampaignStatus } from '@nexor/database';

async function getSummary() {
  try {
    const db = getDatabaseClients().write;
    const [leads, qualified, replies, meetings, won, drafts, sent, runningCampaigns] = await Promise.all([
      db.lead.count(),
      db.lead.count({ where: { status: LeadStatus.QUALIFIED } }),
      db.lead.count({ where: { status: LeadStatus.REPLIED } }),
      db.lead.count({ where: { status: LeadStatus.MEETING_BOOKED } }),
      db.lead.count({ where: { status: LeadStatus.WON } }),
      db.outreach.count({ where: { status: { in: [OutreachStatus.DRAFT, OutreachStatus.APPROVAL_REQUIRED] } } }),
      db.outreach.count({ where: { status: OutreachStatus.SENT } }),
      db.campaign.count({ where: { status: CampaignStatus.RUNNING } }),
    ]);
    return { leads, qualified, replies, meetings, won, drafts, sent, runningCampaigns, dbConnected: true };
  } catch {
    return { leads: 0, qualified: 0, replies: 0, meetings: 0, won: 0, drafts: 0, sent: 0, runningCampaigns: 0, dbConnected: false };
  }
}

export default async function Dashboard() {
  const summary = await getSummary();
  return (
    <DashboardLayout>
      <NexorCommandCenter summary={summary} />
    </DashboardLayout>
  );
}
