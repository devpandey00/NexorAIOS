import { NextRequest, NextResponse } from 'next/server';
import { commandExecutorService } from '@nexor/ai';
import { getDatabaseClients } from '@nexor/database';
import { MemoryService } from '@nexor/core';
import { runAutopilot } from '@/lib/autopilot-runner';
import { getSessionUser } from '@/lib/auth';

export const maxDuration = 300;

async function authorized(req: NextRequest) {
  const secret = process.env.OUTREACH_API_SECRET?.trim();
  if (secret && req.headers.get('authorization') === `Bearer ${secret}`) return true;
  return Boolean(await getSessionUser(req));
}

function getDb() {
  return getDatabaseClients().write;
}

function getMemoryService() {
  return new MemoryService(getDb());
}

function isStartCommand(query: string) {
  return /^(?:let(?:'|’)s\s+)?(?:start|begin|run|launch)(?:\s+(?:nexor|everything|all|autopilot|the\s+workflow))?[.!\s]*$/i.test(query)
    || /^(?:let(?:'|’)s\s+)?start\s+(?:the\s+)?(?:full|complete|autonomous)\s+(?:workflow|system|nexor)[.!\s]*$/i.test(query);
}

export async function POST(req: NextRequest) {
  if (!(await authorized(req))) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const startedAt = Date.now();

  try {
    const body = await req.json();
    const query = typeof body.query === 'string' ? body.query.trim() : '';
    const suppliedContext = body.context && typeof body.context === 'object' ? body.context : {};

    if (!query) {
      return NextResponse.json({ success: false, error: 'Query is required' }, { status: 400 });
    }

    if (isStartCommand(query)) {
      const result = await runAutopilot();
      return NextResponse.json({
        success: Boolean(result.success),
        query,
        route: {
          workflow: 'autopilot',
          confidence: 1,
          reason: 'Explicit Nexor start command routed to the autonomous cloud workflow.',
        },
        execution: {
          success: Boolean(result.success),
          results: result as unknown as Record<string, unknown>,
          executionTime: Date.now() - startedAt,
        },
        durationMs: Date.now() - startedAt,
      }, { status: result.success ? 200 : 500 });
    }

    const memoryContext = await getMemoryService().buildContext(30);
    const context = {
      ...memoryContext,
      ...suppliedContext,
    };

    const result = await commandExecutorService.execute(query, context);

    const executionSuccess = Boolean(result.execution?.success);
    return NextResponse.json({
      success: executionSuccess,
      query,
      route: result.route,
      execution: result.execution,
      contextMemoryCount: Object.keys(memoryContext).length,
      durationMs: Date.now() - startedAt,
    }, { status: executionSuccess ? 200 : 502 });
  } catch (error) {
    console.error('[NEXOR COMMAND ERROR]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        status: 'failed',
        durationMs: Date.now() - startedAt,
      },
      { status: 500 },
    );
  }
}
