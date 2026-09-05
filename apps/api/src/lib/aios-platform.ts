import { getDatabaseClients } from '@nexor/database';
import { NEXOR_BRAND } from '@nexor/shared';

export type AiosStatus = 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'NOT_CONFIGURED' | 'APPROVAL_REQUIRED';

let initialized = false;
let initializing: Promise<void> | null = null;

async function db() {
  const prisma = getDatabaseClients().write;
  if (!initialized) {
    if (!initializing) {
      initializing = (async () => {
        const schemaStatements = [
          `CREATE TABLE IF NOT EXISTS public.aios_companies (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(255) NOT NULL, website varchar(1000), industry varchar(150), location varchar(255), owner_name varchar(255), notes text,
            created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(name, website)
          )`,
          `CREATE TABLE IF NOT EXISTS public.aios_contacts (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid REFERENCES public.aios_companies(id) ON DELETE CASCADE, lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
            name varchar(255), email varchar(255), phone varchar(50), linkedin varchar(1000), instagram varchar(1000), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
          )`,
          `CREATE TABLE IF NOT EXISTS public.aios_approvals (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(), action varchar(100) NOT NULL, target_type varchar(100) NOT NULL, target_id varchar(255), payload jsonb NOT NULL DEFAULT '{}'::jsonb,
            reason text, status varchar(40) NOT NULL DEFAULT 'PENDING', created_by uuid, approved_by uuid, created_at timestamptz NOT NULL DEFAULT now(), approved_at timestamptz, executed_at timestamptz,
            provider_response jsonb, error text
          )`,
          `CREATE INDEX IF NOT EXISTS idx_aios_approvals_status_created ON public.aios_approvals(status, created_at)`,
          `CREATE TABLE IF NOT EXISTS public.aios_automations (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(255) NOT NULL, description text, enabled boolean NOT NULL DEFAULT true, trigger_type varchar(100) NOT NULL,
            conditions jsonb NOT NULL DEFAULT '[]'::jsonb, actions jsonb NOT NULL DEFAULT '[]'::jsonb, created_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
          )`,
          `CREATE TABLE IF NOT EXISTS public.aios_automation_runs (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(), automation_id uuid NOT NULL REFERENCES public.aios_automations(id) ON DELETE CASCADE, status varchar(40) NOT NULL DEFAULT 'QUEUED',
            trigger_payload jsonb, result jsonb, error text, attempts int NOT NULL DEFAULT 0, started_at timestamptz, completed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
          )`,
          `CREATE INDEX IF NOT EXISTS idx_aios_automation_runs_status ON public.aios_automation_runs(status, created_at)`,
          `CREATE TABLE IF NOT EXISTS public.aios_invoices (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(), invoice_number varchar(80) NOT NULL UNIQUE, client_name varchar(255) NOT NULL, client_email varchar(255), opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE SET NULL,
            subtotal numeric(12,2) NOT NULL DEFAULT 0, discount numeric(12,2) NOT NULL DEFAULT 0, tax numeric(12,2) NOT NULL DEFAULT 0, total numeric(12,2) NOT NULL DEFAULT 0,
            currency varchar(10) NOT NULL DEFAULT 'INR', status varchar(40) NOT NULL DEFAULT 'DRAFT', issue_date timestamptz NOT NULL DEFAULT now(), due_date timestamptz, notes text, created_by uuid,
            created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
          )`,
          `CREATE TABLE IF NOT EXISTS public.aios_invoice_items (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(), invoice_id uuid NOT NULL REFERENCES public.aios_invoices(id) ON DELETE CASCADE, description varchar(500) NOT NULL,
            quantity numeric(12,2) NOT NULL DEFAULT 1, unit_price numeric(12,2) NOT NULL DEFAULT 0, amount numeric(12,2) NOT NULL DEFAULT 0
          )`,
          `CREATE TABLE IF NOT EXISTS public.aios_payments (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(), invoice_id uuid NOT NULL REFERENCES public.aios_invoices(id) ON DELETE CASCADE, amount numeric(12,2) NOT NULL,
            method varchar(80), reference varchar(255), status varchar(40) NOT NULL DEFAULT 'RECORDED', paid_at timestamptz, provider_response jsonb, created_by uuid, created_at timestamptz NOT NULL DEFAULT now()
          )`,
          `CREATE INDEX IF NOT EXISTS idx_aios_payments_invoice ON public.aios_payments(invoice_id)`,
          `CREATE TABLE IF NOT EXISTS public.aios_client_workspaces (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_name varchar(255) NOT NULL, client_email varchar(255), company_name varchar(255), owner_user_id uuid,
            status varchar(40) NOT NULL DEFAULT 'ONBOARDING', goals text, services jsonb NOT NULL DEFAULT '[]'::jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
          )`,
          `CREATE TABLE IF NOT EXISTS public.aios_client_onboarding (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL REFERENCES public.aios_client_workspaces(id) ON DELETE CASCADE, checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
            completed_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(workspace_id)
          )`,
          `CREATE TABLE IF NOT EXISTS public.aios_notifications (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, type varchar(100) NOT NULL, title varchar(255) NOT NULL, body text, href varchar(1000), read boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
          )`,
          `CREATE INDEX IF NOT EXISTS idx_aios_notifications_user_read ON public.aios_notifications(user_id, read, created_at)`,
          `CREATE TABLE IF NOT EXISTS public.aios_audit_logs (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, action varchar(150) NOT NULL, target_type varchar(100), target_id varchar(255), before_state jsonb, after_state jsonb,
            provider_response jsonb, success boolean NOT NULL DEFAULT true, error text, created_at timestamptz NOT NULL DEFAULT now()
          )`,
          `CREATE INDEX IF NOT EXISTS idx_aios_audit_logs_target ON public.aios_audit_logs(target_type, target_id, created_at)`,
          `CREATE TABLE IF NOT EXISTS public.aios_agent_runs (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(), agent varchar(100) NOT NULL, status varchar(40) NOT NULL DEFAULT 'QUEUED', input jsonb, output jsonb, error text, user_id uuid,
            started_at timestamptz, completed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
          )`,
          `CREATE TABLE IF NOT EXISTS public.aios_forecast_snapshots (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(), period_start timestamptz NOT NULL, period_end timestamptz NOT NULL, pipeline numeric(12,2) NOT NULL DEFAULT 0,
            weighted_pipeline numeric(12,2) NOT NULL DEFAULT 0, won_revenue numeric(12,2) NOT NULL DEFAULT 0, outstanding numeric(12,2) NOT NULL DEFAULT 0, methodology jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
          )`,
        ];
        for (const statement of schemaStatements) {
          await prisma.$executeRawUnsafe(statement);
        }
        initialized = true;
      })().finally(() => { initializing = null; });
    }
    await initializing;
  }
  return prisma;
}

export async function ensureAiosPlatform() { await db(); }

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
  return {
    brand: NEXOR_BRAND.name,
    sales: { leads: toNumber(leadCounts.reduce((s, x) => s + x.count, BigInt(0))), contacted: leads.CONTACTED ?? 0, replies: leads.REPLIED ?? 0, qualified: leads.QUALIFIED ?? 0, meetings: leads.MEETING_BOOKED ?? 0, proposals: leads.PROPOSAL_SENT ?? 0, won: leads.WON ?? 0, lost: leads.LOST ?? 0, pipeline, expectedRevenue: weighted },
    marketing: { campaigns: campaigns.reduce((s, x) => s + toNumber(x.count), 0), social },
    operations: { tasksDue: toNumber(tasks[0]?.count ?? 0), followUpsDue: toNumber(followUps[0]?.count ?? 0), pendingApprovals: toNumber(approvals.find(x => x.status === 'PENDING')?.count ?? 0), unreadNotifications: toNumber(notifications[0]?.count ?? 0) },
    finance: { revenue, invoices: invoiceRows, outstanding: Number((invoiceRows.SENT?.total ?? 0) + (invoiceRows.OVERDUE?.total ?? 0)), paid: invoiceRows.PAID?.total ?? 0, forecast: weighted },
    clients: Object.fromEntries(clients.map(x => [x.status, toNumber(x.count)])),
    automations: { active: toNumber(automations.find(x => x.enabled)?.count ?? 0) },
    approvals,
    proposals,
  };
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
  return prisma.$queryRawUnsafe(`SELECT id, action, target_type AS "targetType", target_id AS "targetId", payload, reason, status, created_at AS "createdAt", approved_at AS "approvedAt", executed_at AS "executedAt", error FROM public.aios_approvals WHERE status = $1 ORDER BY created_at DESC LIMIT 100`, status);
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
