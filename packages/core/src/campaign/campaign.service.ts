import { CampaignStatus, JobStatus, JobType } from '@nexor/database';

async function getPrisma() {
  const { getDatabaseClients } = await import('@nexor/database');
  return getDatabaseClients().write;
}

export interface CreateCampaignInput {
  name: string;
  query: string;
}

export class CampaignService {
  async create(input: CreateCampaignInput) {
    const prisma = await getPrisma();
    return prisma.campaign.create({
      data: {
        name: input.name,
        query: input.query,
        status: CampaignStatus.QUEUED,
      },
    });
  }

  async getById(id: string) {
    const prisma = await getPrisma();
    return prisma.campaign.findUnique({
      where: { id },
      include: {
        leads: {
          include: {
            lead: true,
          },
        },
        jobs: true,
        activities: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 50,
        },
      },
    });
  }

  async createDiscoveryJob(campaignId: string) {
    const prisma = await getPrisma();
    return prisma.job.create({
      data: {
        campaignId,
        type: JobType.LEAD_DISCOVERY,
        status: JobStatus.QUEUED,
        payload: {
          campaignId,
        },
      },
    });
  }

  async updateStatus(id: string, status: CampaignStatus) {
    const prisma = await getPrisma();
    return prisma.campaign.update({
      where: { id },
      data: {
        status,
        ...(status === CampaignStatus.RUNNING ? { startedAt: new Date() } : {}),
        ...(status === CampaignStatus.COMPLETED ||
        status === CampaignStatus.FAILED ||
        status === CampaignStatus.CANCELLED
          ? { completedAt: new Date() }
          : {}),
      },
    });
  }
}

export const campaignService = new CampaignService();
