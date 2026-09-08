import type { Tool, ToolInput, ToolOutput } from '../types/tool.js';
import { getDatabaseClients, LeadStatus, OutreachChannel, OutreachStatus } from '@nexor/database';
import { outreachService } from '@nexor/ai';

const BLOCKED = [/\bjobs?\b/i, /\bvacanc(?:y|ies)\b/i, /\bcareers?\b/i, /\bhiring\b/i, /\bsalary\b/i, /\bapply now\b/i, /\bresume\b/i, /\bcv\b/i, /\binternship\b/i, /\btop\b/i, /\bbest\b/i, /\blist\b/i, /\bdirectory\b/i, /\bguide\b/i, /\bnews\b/i, /\barticle\b/i, /\bhow to\b/i];
const BLOCKED_PATH = /\/(jobs?|careers?|vacancies|blog|article|news|category|tag|search|directory|listing|forum|forums)(\/|$)/i;

function getPrisma() { return getDatabaseClients().write; }

function parseNotes(notes: string | null) {
  if (!notes) return {} as Record<string, unknown>;
  try { const parsed = JSON.parse(notes); return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {}; } catch { return {}; }
}

export const outreachDraftTool: Tool = {
  id: 'outreach_draft', name: 'Outreach Draft', description: 'Create a personalized WhatsApp or email draft directly in the approval queue.', category: 'communication',
  async execute(input: ToolInput): Promise<ToolOutput> {
    const leadId = typeof input.leadId === 'string' ? input.leadId : '';
    const channel = input.channel === 'EMAIL' ? OutreachChannel.EMAIL : input.channel === 'WHATSAPP' ? OutreachChannel.WHATSAPP : null;
    if (!leadId || !channel) return { success: false, error: 'leadId and channel are required' };
    try {
      const prisma = getPrisma();
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead) return { success: false, error: 'Lead not found' };
      if (!lead.businessName.trim() || BLOCKED.some((pattern) => pattern.test(lead.businessName))) return { success: false, error: 'Blocked non-business lead' };
      if (lead.website) {
        try { if (BLOCKED_PATH.test(new URL(lead.website).pathname)) return { success: false, error: 'Blocked non-business website' }; } catch { return { success: false, error: 'Invalid lead website' }; }
      }
      if (channel === OutreachChannel.WHATSAPP && !lead.whatsapp) return { success: false, error: 'NOT CONTACTABLE: WhatsApp number missing' };
      const existing = await prisma.outreach.findFirst({ where: { leadId, channel, status: { in: [OutreachStatus.DRAFT, OutreachStatus.APPROVAL_REQUIRED, OutreachStatus.APPROVED, OutreachStatus.SCHEDULED] } }, orderBy: { createdAt: 'desc' } });
      if (existing) return { success: true, data: { success: true, duplicate: true, outreach: existing } };
      const parsed = parseNotes(lead.notes);
      let message = '';
      if (channel === OutreachChannel.WHATSAPP) {
        const generated = await outreachService.generate({ businessName: lead.businessName, ownerName: lead.ownerName, niche: lead.niche, country: lead.country, website: lead.website, whatsapp: lead.whatsapp, auditScore: lead.auditScore, notes: lead.notes, verifiedResearch: parsed.research ?? {}, verifiedScore: parsed.score ?? {}, leadMetadata: { leadType: 'BUSINESS', source: typeof parsed.source === 'string' ? parsed.source : 'sales-machine' }, uniquenessInstruction: `Create a unique first-contact WhatsApp message for ${lead.businessName}. Use only verified findings from this lead. ${typeof input.context === 'string' ? input.context : ''}` });
        message = typeof generated?.whatsapp === 'string' ? generated.whatsapp.trim() : '';
      } else {
        const name = lead.ownerName || lead.businessName;
        message = `Subject: A quick growth observation for ${lead.businessName}\n\nHi ${name},\n\nI reviewed ${lead.businessName} and identified a few opportunities around online lead generation. ${typeof input.context === 'string' ? input.context : 'I can share the specific findings and a practical action plan if useful.'}\n\nRegards,\nNexor Media`;
      }
      if (!message) return { success: false, error: 'Unable to produce a personalized outreach draft' };
      const outreach = await prisma.$transaction(async (tx) => {
        const created = await tx.outreach.create({ data: { leadId, channel, status: OutreachStatus.APPROVAL_REQUIRED, message } });
        await tx.lead.update({ where: { id: leadId }, data: { status: LeadStatus.PITCH_READY } });
        return created;
      });
      return { success: true, data: { success: true, duplicate: false, outreach } };
    } catch (error) {
      return { success: false, error: `Draft creation failed: ${error instanceof Error ? error.message : String(error)}` };
    }
  },
};
