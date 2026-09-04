import { getDatabaseClients } from '@nexor/database';
import { getCommandCenter, ensureAiosPlatform, writeAudit } from './aios-platform';
import { buildSalesMessage } from './sales-message-engine';
import { createSocialContent } from './social-content';
import { NEXOR_BRAND } from '@nexor/shared';

export async function executeAiosAgent(agent: string, input: Record<string, unknown>, userId: string) {
  const normalized = agent.toUpperCase();
  await ensureAiosPlatform();
  const db = getDatabaseClients().write;
  const started = new Date();
  const runRows = await db.$queryRawUnsafe<Array<{ id: string }>>(`INSERT INTO public.aios_agent_runs (agent,status,input,user_id,started_at) VALUES ($1,'RUNNING',$2::jsonb,$3::uuid,$4) RETURNING id`, normalized, JSON.stringify(input), userId, started);
  const runId = runRows[0]?.id;
  try {
    let output: unknown;
    if (normalized === 'SALES') {
      const leads = await db.lead.findMany({ where: { auditScore: { gte: Number(input.minScore ?? 70) } }, orderBy: { auditScore: 'desc' }, take: Math.min(Number(input.limit ?? 10), 25) });
      const drafts = leads.map(lead => ({ leadId: lead.id, businessName: lead.businessName, message: buildSalesMessage({ businessName: lead.businessName, country: lead.country, website: lead.website, channel: lead.email ? 'EMAIL' : 'WHATSAPP', stage: 'FIRST_TOUCH' }) }));
      output = { qualifiedLeads: leads.length, drafts, externalActions: 'APPROVAL_REQUIRED' };
    } else if (normalized === 'CONTENT' || normalized === 'CREATIVE') {
      const platforms = Array.isArray(input.platforms) ? input.platforms.map(String).filter(Boolean) : ['INSTAGRAM','LINKEDIN'];
      const created = [];
      for (const platform of platforms.slice(0, 4)) created.push(await createSocialContent({ platform: platform as any, status: 'DRAFT', title: `${NEXOR_BRAND.name} AI ${normalized.toLowerCase()} draft`, caption: String(input.topic || `One practical ${NEXOR_BRAND.name} growth insight for business owners.`), hashtags: NEXOR_BRAND.defaultHashtags }));
      output = { draftsCreated: created.length, drafts: created.map(x => x.id) };
    } else if (normalized === 'FINANCE') {
      output = await getCommandCenter().then(x => ({ pipeline: x.sales.pipeline, expectedRevenue: x.sales.expectedRevenue, paid: x.finance.paid, outstanding: x.finance.outstanding }));
    } else if (normalized === 'OPERATIONS') {
      output = await getCommandCenter().then(x => ({ tasksDue: x.operations.tasksDue, followUpsDue: x.operations.followUpsDue, pendingApprovals: x.operations.pendingApprovals, unreadNotifications: x.operations.unreadNotifications }));
    } else if (normalized === 'RESEARCH' || normalized === 'SEO' || normalized === 'ADS' || normalized === 'CLIENT_SUCCESS') {
      output = await getCommandCenter().then(x => ({ summary: x, mode: normalized }));
    } else throw new Error(`Unsupported agent: ${normalized}`);
    await db.$executeRawUnsafe(`UPDATE public.aios_agent_runs SET status='SUCCESS',output=$1::jsonb,completed_at=now() WHERE id=$2::uuid`, JSON.stringify(output), runId);
    await writeAudit({ userId, action: 'AGENT_EXECUTED', targetType: 'AGENT_RUN', targetId: runId, after: output });
    return { runId, status: 'SUCCESS', output };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.$executeRawUnsafe(`UPDATE public.aios_agent_runs SET status='FAILED',error=$1,completed_at=now() WHERE id=$2::uuid`, message, runId);
    await writeAudit({ userId, action: 'AGENT_FAILED', targetType: 'AGENT_RUN', targetId: runId, success: false, error: message });
    throw error;
  }
}
