import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { createGrowthMission, listGrowthMissions, runGrowthMission } from '@/lib/growth-mission';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try { return NextResponse.json({ success: true, missions: await listGrowthMissions(user.id) }); }
  catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const goal = typeof body.goal === 'string' ? body.goal.trim() : '';
    if (!goal) return NextResponse.json({ success: false, error: 'goal is required' }, { status: 400 });
    const context = body.context && typeof body.context === 'object' ? body.context : {};
    const mission = await createGrowthMission(user.id, goal, context);
    if (body.execute === true) {
      const result = await runGrowthMission(mission.id, user.id);
      return NextResponse.json({ success: true, mission, result });
    }
    return NextResponse.json({ success: true, mission });
  } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 }); }
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json(); const id = String(body.id ?? '').trim();
    if (!id) return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    return NextResponse.json({ success: true, result: await runGrowthMission(id, user.id) });
  } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 }); }
}
