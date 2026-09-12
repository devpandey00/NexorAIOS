import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClients } from '@nexor/database';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';

const KEY = 'founder_profile';
const DEFAULTS = {
  founder_name: 'Dev',
  founder_role: 'Founder · Nexor Media',
  avatar_url: '/founder-avatar.svg',
  theme: 'Executive Pearl',
  accent: 'Indigo',
  density: 'Comfortable',
  font_scale: 'Default',
};

async function authorized(request: NextRequest) {
  const user = await getSessionUser(request);
  return Boolean(user && user.role === 'ADMIN');
}

export async function GET(request: NextRequest) {
  if (!(await authorized(request))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const db = getDatabaseClients().read;
    const row = await db.automationSetting.findUnique({ where: { key: KEY } });
    return NextResponse.json({ success: true, profile: { ...DEFAULTS, ...(row?.config && typeof row.config === 'object' ? row.config : {}) } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await authorized(request))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const input = body?.profile && typeof body.profile === 'object' ? body.profile : body;
    const profile = {
      founder_name: typeof input?.founder_name === 'string' ? input.founder_name.slice(0, 120) : DEFAULTS.founder_name,
      founder_role: typeof input?.founder_role === 'string' ? input.founder_role.slice(0, 160) : DEFAULTS.founder_role,
      avatar_url: typeof input?.avatar_url === 'string' && input.avatar_url.length <= 800_000 ? input.avatar_url : DEFAULTS.avatar_url,
      theme: typeof input?.theme === 'string' ? input.theme.slice(0, 60) : DEFAULTS.theme,
      accent: typeof input?.accent === 'string' ? input.accent.slice(0, 40) : DEFAULTS.accent,
      density: typeof input?.density === 'string' ? input.density.slice(0, 40) : DEFAULTS.density,
      font_scale: typeof input?.font_scale === 'string' || typeof input?.font_scale === 'number' ? input.font_scale : DEFAULTS.font_scale,
    };
    const db = getDatabaseClients().write;
    const setting = await db.automationSetting.upsert({
      where: { key: KEY },
      create: { key: KEY, enabled: true, config: profile },
      update: { config: profile },
    });
    return NextResponse.json({ success: true, profile: setting.config });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
