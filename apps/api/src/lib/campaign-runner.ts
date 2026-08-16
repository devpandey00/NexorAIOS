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

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
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
        const normalizedWebsite = result.website ? normalizeWebsite(result.website) : '';
        const normalizedPhone = result.phone ? normalizePhone(result.phone) : '';
        const existing = normalizedWebsite
          ? await prisma.lead.findFirst({ where: { website: normalizedWebsite } })
          : normalizedPhone
            ? await prisma.lead.findFirst({ where: { whatsapp: normalizedPhone } })
            : await prisma.lead.findFirst({
                where: { businessName: { equals: result.name, mode: 'insensitive' } },
              });

        let lead = existing;
        if (!lead) {
          lead = await prisma.lead.create({
            data: {
              businessName: result.name,
              niche: campaign.query,
              country: 'Unknown',
              website: normalizedWebsite || undefined,
              whatsapp: normalizedPhone || undefined,
              status: LeadStatus.NEW,
            },
          });
        }

        await prisma.campaignLead.upsert({
          where: { campaignId_leadId: { campaignId, leadId: lead.id } },
          create: { campaignId, leadId: lead.id },
          update: {},
        });

        if (!result.website) {
          if (normalizedPhone && !lead.whatsapp) {
            await prisma.lead.update({ where: { id: lead.id }, data: { whatsapp: normalizedPhone } });
          }
          processed++;
          successful++;
          continue;
        }

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
            whatsapp: phone ? normalizePhone(phone) : lead.whatsapp,
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

          const existingWhatsAppDraft = await prisma.outreach.findFirst({
            where: {
              leadId: lead.id,
              channel: OutreachChannel.WHATSAPP,
              status: { in: [OutreachStatus.DRAFT, OutreachStatus.APPROVAL_REQUIRED, OutreachStatus.APPROVED, OutreachStatus.SCHEDULED, OutreachStatus.SENT] },
            },
            orderBy: { createdAt: 'desc' },
          });

          if (!existingWhatsAppDraft) {
            await prisma.outreach.create({
              data: {
                leadId: lead.id,
                campaignId,
                channel: OutreachChannel.WHATSAPP,
                status: OutreachStatus.DRAFT,
                message: whatsappMessage,
              },
            });
          }

          if (email) {
            const existingEmailDraft = await prisma.outreach.findFirst({
              where: {
                leadId: lead.id,
                channel: OutreachChannel.EMAIL,
                status: { in: [OutreachStatus.DRAFT, OutreachStatus.APPROVAL_REQUIRED, OutreachStatus.APPROVED, OutreachStatus.SCHEDULED, OutreachStatus.SENT] },
              },
              orderBy: { createdAt: 'desc' },
            });

            if (!existingEmailDraft) {
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
