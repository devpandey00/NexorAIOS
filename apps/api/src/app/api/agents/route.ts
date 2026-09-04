import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getDatabaseClients } from '@nexor/database';
import { ensureAiosPlatform, listAgents } from '@/lib/aios-platform';
import { executeAiosAgent } from '@/lib/aios-agent-orchestrator';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    await ensureAiosPlatform();
    const db = getDatabaseClients().read;
    const runs = await db.$queryRawUnsafe(`SELECT agent, status, count(*)::int AS count, max(created_at) AS "lastRunAt" FROM public.aios_agent_runs GROUP BY agent,status ORDER BY agent,status`);
    return NextResponse.json({ success: true, agents: await listAgents(), runs });
  } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 }); }
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const agent = String(body.agent || '').toUpperCase();
    const allowed = (await listAgents()).map(x => x.name);
    if (!allowed.includes(agent)) throw new Error('Unknown agent');
    const result = await executeAiosAgent(agent, body.input && typeof body.input === 'object' ? body.input : {}, user.id);
    return NextResponse.json({ success: true, ...result });
  } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 }); }
}
