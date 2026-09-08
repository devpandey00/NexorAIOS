import { getDatabaseClients } from '@nexor/database';
import { NEXOR_BRAND } from '@nexor/shared';

export type AiosStatus = 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'NOT_CONFIGURED' | 'APPROVAL_REQUIRED';

async function db() {
  // AIOS platform tables are created exclusively by Prisma migrations.
  // Runtime requests must never mutate production schema.
  return getDatabaseClients().write;
}

function jsonSafe<T>(value: T): T {
  if (typeof value === 'bigint') return Number(value) as T;
  if (Array.isArray(value)) return value.map((item) => jsonSafe(item)) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, jsonSafe(item)])) as T;
  }
  return value;
}

export async function ensureAiosPlatform() {
  // Kept as an explicit compatibility hook for existing callers. Schema
  // lifecycle is owned by the migration pipeline, not application startup.
  return db();
}

export async function getCommandCenter() {
  const prisma = await db();
  const [leadCounts, opportunities, proposals, approvals, campaigns, social, tasks, followUps, invoices, payments, clients, automations, notifications] = await Promise.all([
    prisma.$queryRawUnsafe<Array<{ status: string; count: bigint }>>(`SELECT status::text, count(*)::bigint AS count FROM public.leads GROUP BY status`),
    prisma.$queryRawUnsafe<Array<{ stage: string; count: bigint; value: string | null }>>(`SELECT stage::text, count(*)::bigint AS count, COALESCE(SUM(value),0)::text AS value FROM public.opportunities GROUP BY stage`),
    prisma.$queryRawUnsafe<Array<{ status: string; count: bigint }>>(`SELECT status::text, count(*)::bigint AS count FROM public.proposals GROUP BY status`),
    prisma.$queryRawUnsafe<Array<{ status: string; count: bigint }>>(`SELECT status, count(*)::bigint AS count FROM public.aios_approvals GROUP BY status`),
    prisma.$queryRawUnsafe<Array<{ status: string; count: bigint }>>(`SELECT status::text, count(*)::bigint AS count FROM public.campaigns GROUP BY status`),
    prisma.$queryRawUnsafe<Array<{ status: string; count: bigint }>>(`SELECT status::text, count(*)::bigint AS count FROM public.content_posts GROUP BY status`).catch(() => []),
    prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT count(*)::bigint AS count FROM public.tasks WHERE status <> 'COMPLETED' AND due_at IS NOT NULL AND due_at <= now()`).catch(() => [{ count: BigInt(0) }]),
    prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT count(*)::bigint AS count FROM public.follow_ups WHERE status IN ('PENDING','SCHEDULED') AND scheduled_at <= now()`).catch(() => [{ count: BigInt(0) }]),
    prisma.$queryRawUnsafe<Array<{ status: string; count: bigint; total: string }>>(`SELECT status, count(*)::bigint AS count, COALESCE(SUM(total),0)::text AS total FROM public.aios_invoices GROUP BY status`),
    prisma.$queryRawUnsafe<Array<{ total: string }>>(`SELECT COALESCE(SUM(amount),0)::text AS total FROM public.aios_payments WHERE status IN ('RECORDED','CONFIRMED')`),
    prisma.$queryRawUnsafe<Array<{ status: string; count: bigint }>>(`SELECT status, count(*)::bigint AS count FROM public.aios_client_workspaces GROUP BY status`),
    prisma.$queryRawUnsafe<Array<{ enabled: boolean; count: bigint }>>(`SELECT enabled, count(*)::bigint AS count FROM public.aios_automations GROUP BY enabled`),
    prisma.$queryRawUnsafe<Array<{ count: bigint }>>(`SELECT count(*)::bigint AS count FROM public.aios_notifications WHERE read = false`),
  ]);
  const toNumber = (v: bigint | string | number) => Number(v);
  const leads = Object.fromEntries(leadCounts.map(x => [x.status, toNumber(x.count)]));
  const stageRows = Object.fromEntries(opportunities.map(x => [x.stage, { count: toNumber(x.count), value: Number(x.value ?? 0) }]));
  const pipeline = Object.entries(stageRows).filter(([s]) => !['WON','LOST'].includes(s)).reduce((sum, [, x]) => sum + x.value, 0);
  const probabilities: Record<string, number> = { OPEN: 0.2, QUALIFIED: 0.4, PROPOSAL: 0.65, WON: 1, LOST: 0 };
  const weighted = Object.entries(stageRows).reduce((sum, [s, x]) => sum + x.value * (probabilities[s] ?? 0), 0);
  const invoiceRows = Object.fromEntries(invoices.map(x => [x.status, { count: toNumber(x.count), total: Number(x.total) }]));
  const revenue = Number(payments[0]?.total ?? 0);
  return jsonSafe({
    brand: NEXOR_BRAND.name,
    sales: { leads: toNumber(leadCounts.reduce((s, x) => s + x.count, BigInt(0))), contacted: leads.CONTACTED ?? 0, replies: leads.REPLIED ?? 0, qualified: leads.QUALIFIED ?? 0, meetings: leads.MEETING_BOOKED ?? 0, proposals: leads.PROPOSAL_SENT ?? 0, won: leads.WON ?? 0, lost: leads.LOST ?? 0, pipeline, expectedRevenue: weighted },
    marketing: { campaigns: campaigns.reduce((s, x) => s + toNumber(x.count), 0), social },
    operations: { tasksDue: toNumber(tasks[0]?.count ?? 0), followUpsDue: toNumber(followUps[0]?.count ?? 0), pendingApprovals: toNumber(approvals.find(x => x.status === 'PENDING')?.count ?? 0), unreadNotifications: toNumber(notifications[0]?.count ?? 0) },
    finance: { revenue, invoices: invoiceRows, outstanding: Number((invoiceRows.SENT?.total ?? 0) + (invoiceRows.OVERDUE?.total ?? 0)), paid: invoiceRows.PAID?.total ?? 0, forecast: weighted },
    clients: Object.fromEntries(clients.map(x => [x.status, toNumber(x.count)])),
    automations: { active: toNumber(automations.find(x => x.enabled)?.count ?? 0) },
    approvals,
    proposals,
  });
}

export async function writeAudit(input: { userId?: string | null; action: string; targetType?: string; targetId?: string; before?: unknown; after?: unknown; providerResponse?: unknown; success?: boolean; error?: string }) {
  const prisma = await db();
  await prisma.$executeRawUnsafe(`INSERT INTO public.aios_audit_logs (user_id,action,target_type,target_id,before_state,after_state,provider_response,success,error) VALUES ($1::uuid,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8,$9)`, input.userId ?? null, input.action, input.targetType ?? null, input.targetId ?? null, JSON.stringify(input.before ?? null), JSON.stringify(input.after ?? null), JSON.stringify(input.providerResponse ?? null), input.success ?? true, input.error ?? null);
}

export async function createApproval(input: { action: string; targetType: string; targetId?: string | null; payload: unknown; reason?: string | null; userId?: string | null }) {
  const prisma = await db();
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`INSERT INTO public.aios_approvals (action,target_type,target_id,payload,reason,created_by) VALUES ($1,$2,$3,$4::jsonb,$5,$6::uuid) RETURNING id`, input.action, input.targetType, input.targetId ?? null, JSON.stringify(input.payload), input.reason ?? null, input.userId ?? null);
  await writeAudit({ userId: input.userId, action: 'APPROVAL_CREATED', targetType: input.targetType, targetId: rows[0]?.id, after: input.payload });
  return rows[0]?.id;
}

export async function listApprovals(status = 'PENDING') {
  const prisma = await db();
  const rows = await prisma.$queryRawUnsafe(`SELECT id, action, target_type AS "targetType", target_id AS "targetId", payload, reason, status, created_at AS "createdAt", approved_at AS "approvedAt", executed_at AS "executedAt", error FROM public.aios_approvals WHERE status = $1 ORDER BY created_at DESC LIMIT 100`, status);
  return jsonSafe(rows);
}

export async function setApproval(id: string, status: 'APPROVED' | 'REJECTED', userId?: string | null) {
  const prisma = await db();
  await prisma.$executeRawUnsafe(`UPDATE public.aios_approvals SET status=$1, approved_by=$2::uuid, approved_at=now() WHERE id=$3::uuid AND status='PENDING'`, status, userId ?? null, id);
  await writeAudit({ userId, action: `APPROVAL_${status}`, targetType: 'APPROVAL', targetId: id });
}

export async function listAgents() {
  return [
    ['SALES', 'Find, qualify and advance prospects', ['leads','crm','sales-messages'], true], ['RESEARCH', 'Research websites, market signals and opportunities', ['research','opportunities'], true],
    ['CONTENT', 'Plan captions, scripts and content calendars', ['social','content'], true], ['CREATIVE', 'Turn briefs into original creative specifications', ['creative','social'], true],
    ['SEO', 'Audit and prioritize organic growth opportunities', ['seo','research'], true], ['ADS', 'Analyze configured ad data and recommend actions', ['ads','analytics'], true],
    ['OPERATIONS', 'Tasks, approvals, follow-ups and workflow health', ['tasks','automations'], true], ['CLIENT_SUCCESS', 'Onboarding, client health and reporting', ['clients','reports'], true],
    ['FINANCE', 'Invoices, payments and revenue forecasting', ['invoices','forecast'], true],
  ].map(([name, description, tools, enabled]) => ({ name, description, tools, enabled }));
}
