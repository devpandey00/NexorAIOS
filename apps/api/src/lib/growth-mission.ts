import { getDatabaseClients } from '@nexor/database';
import { commandExecutorService } from '@nexor/ai';

export type MissionStep = {
  key: string;
  label: string;
  workflow: string;
  input: Record<string, unknown>;
  approvalRequired: boolean;
};

function db() { return getDatabaseClients().write; }

function buildPlan(goal: string, context: Record<string, unknown>): MissionStep[] {
  const text = goal.toLowerCase();
  const steps: MissionStep[] = [];
  const markets = Array.isArray(context.markets) ? context.markets.map(String).filter(Boolean) : undefined;
  const limit = Math.min(Math.max(Number(context.limit ?? 25), 1), 50);

  if (/client|lead|prospect|customer|sales|acqui|outreach|revenue|book(ed)? meeting/.test(text)) {
    steps.push({ key: 'acquisition', label: 'Discover, research, score and enrich prospects', workflow: 'sales_machine', input: { query: goal, markets, limit, createDrafts: true }, approvalRequired: false });
    steps.push({ key: 'outreach', label: 'Prepare personalized outreach from verified findings', workflow: 'lead_to_outreach', input: { createDrafts: true }, approvalRequired: true });
  }
  if (/website|seo|audit/.test(text)) {
    steps.push({ key: 'audit', label: 'Audit target websites and identify growth gaps', workflow: 'website_audit', input: { command: goal }, approvalRequired: false });
  }
  if (/content|social|instagram|facebook|linkedin|reel|post/.test(text)) {
    steps.push({ key: 'content', label: 'Create a channel-ready content package', workflow: 'social_content', input: { topic: goal, platforms: context.platforms ?? ['INSTAGRAM', 'LINKEDIN'] }, approvalRequired: true });
  }
  if (!steps.length) {
    steps.push({ key: 'research', label: 'Research the goal and return actionable intelligence', workflow: 'research', input: { command: goal }, approvalRequired: false });
  }
  return steps;
}

function json(value: unknown) { return JSON.stringify(value ?? null); }

export async function createGrowthMission(userId: string, goal: string, context: Record<string, unknown> = {}) {
  const plan = buildPlan(goal, context);
  const prisma = db();
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `INSERT INTO public.aios_growth_missions (user_id,goal,status,plan) VALUES ($1::uuid,$2,'PLANNED',$3::jsonb) RETURNING id`,
    userId, goal, json(plan),
  );
  const missionId = rows[0]?.id;
  if (!missionId) throw new Error('Unable to create growth mission');
  for (let i = 0; i < plan.length; i++) {
    const step = plan[i];
    await prisma.$executeRawUnsafe(
      `INSERT INTO public.aios_growth_mission_steps (mission_id,step_order,key,label,input,approval_required) VALUES ($1::uuid,$2,$3,$4,$5::jsonb,$6)`,
      missionId, i + 1, step.key, step.label, json({ workflow: step.workflow, ...step.input }), step.approvalRequired,
    );
  }
  return { id: missionId, goal, status: 'PLANNED', progress: 0, plan };
}

export async function runGrowthMission(missionId: string, userId: string) {
  const prisma = db();
  const missionRows = await prisma.$queryRawUnsafe<Array<{ id: string; goal: string; plan: MissionStep[] }>>(
    `SELECT id,goal,plan FROM public.aios_growth_missions WHERE id=$1::uuid AND user_id=$2::uuid LIMIT 1`, missionId, userId,
  );
  const mission = missionRows[0];
  if (!mission) throw new Error('Mission not found');
  const plan = Array.isArray(mission.plan) ? mission.plan : [];
  await prisma.$executeRawUnsafe(`UPDATE public.aios_growth_missions SET status='RUNNING',updated_at=now() WHERE id=$1::uuid`, missionId);

  const results: Array<Record<string, unknown>> = [];
  for (let i = 0; i < plan.length; i++) {
    const step = plan[i];
    const stepNo = i + 1;
    await prisma.$executeRawUnsafe(`UPDATE public.aios_growth_mission_steps SET status='RUNNING',started_at=now() WHERE mission_id=$1::uuid AND step_order=$2`, missionId, stepNo);
    try {
      // The mission layer never bypasses existing provider/approval safeguards.
      // Sales-machine generates research/CRM/outreach drafts; actual outbound remains approval-gated.
      const execution = await commandExecutorService.execute(`${step.workflow}: ${mission.goal}`, { ...step.input, missionId, userId });
      const record = { step: step.key, workflow: step.workflow, approvalRequired: step.approvalRequired, execution };
      results.push(record);
      await prisma.$executeRawUnsafe(`UPDATE public.aios_growth_mission_steps SET status='SUCCESS',output=$1::jsonb,completed_at=now() WHERE mission_id=$2::uuid AND step_order=$3`, json(record), missionId, stepNo);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await prisma.$executeRawUnsafe(`UPDATE public.aios_growth_mission_steps SET status='FAILED',error=$1,completed_at=now() WHERE mission_id=$2::uuid AND step_order=$3`, message, missionId, stepNo);
      await prisma.$executeRawUnsafe(`UPDATE public.aios_growth_missions SET status='FAILED',result=$1::jsonb,progress=$2,updated_at=now() WHERE id=$3::uuid`, json({ results, error: message }), Math.round((i / Math.max(plan.length, 1)) * 100), missionId);
      throw new Error(`Mission stopped at ${step.label}: ${message}`);
    }
    await prisma.$executeRawUnsafe(`UPDATE public.aios_growth_missions SET progress=$1,updated_at=now() WHERE id=$2::uuid`, Math.round((stepNo / Math.max(plan.length, 1)) * 100), missionId);
  }
  await prisma.$executeRawUnsafe(`UPDATE public.aios_growth_missions SET status='SUCCESS',result=$1::jsonb,progress=100,completed_at=now(),updated_at=now() WHERE id=$2::uuid`, json(results), missionId);
  return { id: missionId, status: 'SUCCESS', progress: 100, results };
}

export async function listGrowthMissions(userId: string) {
  const prisma = getDatabaseClients().read;
  const rows = await prisma.$queryRawUnsafe(`SELECT id,goal,status,progress,plan,result,created_at AS "createdAt",updated_at AS "updatedAt",completed_at AS "completedAt" FROM public.aios_growth_missions WHERE user_id=$1::uuid ORDER BY created_at DESC LIMIT 20`, userId);
  return rows;
}
