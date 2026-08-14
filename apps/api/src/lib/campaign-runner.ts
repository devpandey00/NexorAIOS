import {
  getDatabaseClients,
  JobStatus,
  CampaignStatus,
  LeadStatus,
  OutreachChannel,
  OutreachStatus,
} from '@nexor/database';

import { leadSearchService } from '@nexor/search';
import { researchService } from '@nexor/research';
import { assessLead, buildPersonalizedPitch } from '@nexor/core';

const prisma = getDatabaseClients().write;

function normalizeWebsite(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname.replace(/^www\./, '').toLowerCase()}${parsed.pathname.replace(/\/$/, '')}`;
  } catch {
    return url.trim().toLowerCase().replace(/\/$/, '');
  }
}

export async function runCampaign(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) throw new Error('Campaign not found');

  const job = await prisma.job.findFirst({
    where: { campaignId, status: JobStatus.QUEUED },
    orderBy: { createdAt: 'asc' },
  });
  if (!job) throw new Error('No queued discovery job found');

  await prisma.$transaction([
    prisma.campaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.RUNNING, startedAt: new Date() },
    }),
    prisma.job.update({
      where: { id: job.id },
      data: { status: JobStatus.RUNNING, startedAt: new Date(), attempts: { increment: 1 } },
    }),
  ]);

  try {
    const searchResult = await leadSearchService.search(campaign.query);
    let processed = 0;
    let successful = 0;
    let failed = 0;
    let qualified = 0;

    for (const result of searchResult.leads) {
      try {
        if (!result.website) {
          failed++;
          processed++;
          continue;
        }

        const normalizedWebsite = normalizeWebsite(result.website);
        const existing = await prisma.lead.findFirst({
          where: { website: { equals: result.website } },
        });

        let lead = existing;
        if (!lead) {
          lead = await prisma.lead.create({
            data: {
              businessName: result.name,
              niche: campaign.query,
              country: 'Unknown',
              website: normalizedWebsite,
              whatsapp: result.phone,
              status: LeadStatus.NEW,
            },
          });
        }

        await prisma.campaignLead.upsert({
          where: { campaignId_leadId: { campaignId, leadId: lead.id } },
          create: { campaignId, leadId: lead.id },
          update: {},
        });

        const research = await researchService.analyze(result.website);

        if (!research.success) {
          failed++;
          processed++;
          continue;
        }

        const intelligence = assessLead(research);
        const email = research.contacts?.emails?.[0];
        const phone = research.contacts?.phones?.[0];
        const social = (research.social ?? {}) as Record<string, unknown>;

        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            email: email ?? lead.email,
            whatsapp: phone ?? lead.whatsapp,
            auditScore: intelligence.score,
            status: intelligence.score >= 60 ? LeadStatus.QUALIFIED : LeadStatus.RESEARCHED,
            notes: JSON.stringify({
              research,
              intelligence,
            }),
          },
        });

        const socialEntries = [
          ['INSTAGRAM', social.instagram],
          ['FACEBOOK', social.facebook],
          ['LINKEDIN', social.linkedin],
          ['YOUTUBE', social.youtube],
        ] as const;

        for (const [platform, url] of socialEntries) {
          if (typeof url !== 'string' || !url) continue;
          await prisma.socialProfile.upsert({
            where: { leadId_platform: { leadId: lead.id, platform } },
            create: { leadId: lead.id, platform, url, confidence: 100, source: 'website-research' },
            update: { url, confidence: 100 },
          });
        }

        if (intelligence.score >= 60) {
          qualified++;
          const whatsappMessage = buildPersonalizedPitch({
            businessName: result.name,
            requirement: intelligence.requirement,
            service: intelligence.service,
            findings: intelligence.findings,
          });

          await prisma.outreach.create({
            data: {
              leadId: lead.id,
              campaignId,
              channel: OutreachChannel.WHATSAPP,
              status: OutreachStatus.DRAFT,
              message: whatsappMessage,
            },
          });

          if (email) {
            await prisma.outreach.create({
              data: {
                leadId: lead.id,
                campaignId,
                channel: OutreachChannel.EMAIL,
                status: OutreachStatus.DRAFT,
                message: buildPersonalizedPitch({
                  businessName: result.name,
                  requirement: intelligence.requirement,
                  service: intelligence.service,
                  findings: intelligence.findings,
                  email: true,
                }),
              },
            });
          }
        }

        successful++;
        processed++;
      } catch (error) {
        failed++;
        processed++;
        console.error(`[CAMPAIGN LEAD ERROR] ${result.name}`, error);
      }

      await prisma.campaign.update({
        where: { id: campaignId },
        data: { processedLeads: processed, successfulLeads: successful, failedLeads: failed },
      });
    }

    await prisma.$transaction([
      prisma.job.update({
        where: { id: job.id },
        data: {
          status: JobStatus.COMPLETED,
          completedAt: new Date(),
          result: { discovered: searchResult.count, processed, successful, failed, qualified },
        },
      }),
      prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: failed > 0 ? CampaignStatus.PARTIALLY_COMPLETED : CampaignStatus.COMPLETED,
          completedAt: new Date(),
          totalLeads: searchResult.count,
          processedLeads: processed,
          successfulLeads: successful,
          failedLeads: failed,
        },
      }),
    ]);

    return { success: true, campaignId, discovered: searchResult.count, processed, successful, failed, qualified };
  } catch (error) {
    await prisma.$transaction([
      prisma.job.update({
        where: { id: job.id },
        data: {
          status: JobStatus.FAILED,
          completedAt: new Date(),
          error: error instanceof Error ? error.message : String(error),
        },
      }),
      prisma.campaign.update({
        where: { id: campaignId },
        data: { status: CampaignStatus.FAILED, completedAt: new Date() },
      }),
    ]);
    throw error;
  }
}
