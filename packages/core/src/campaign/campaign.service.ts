import { PrismaClient, CampaignStatus, JobStatus, JobType } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateCampaignInput {
  name: string;
  query: string;
}

export class CampaignService {
  async create(input: CreateCampaignInput) {
    return prisma.campaign.create({
      data: {
        name: input.name,
        query: input.query,
        status: CampaignStatus.QUEUED,
      },
    });
  }

  async getById(id: string) {
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
