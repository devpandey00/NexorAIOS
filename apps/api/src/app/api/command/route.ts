import { NextRequest, NextResponse } from 'next/server';
import { commandExecutorService } from '@nexor/ai';
import { getDatabaseClients } from '@nexor/database';
import { MemoryService } from '@nexor/core';

export const maxDuration = 300;

const db = getDatabaseClients().write;
const memoryService = new MemoryService(db);

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  try {
    const body = await req.json();
    const query = typeof body.query === 'string' ? body.query.trim() : '';
    const suppliedContext = body.context && typeof body.context === 'object' ? body.context : {};

    if (!query) {
      return NextResponse.json({ success: false, error: 'Query is required' }, { status: 400 });
    }

    // Persistent memory is injected into every command so Nexor can retain
    // durable business context, preferences, decisions and prior outcomes.
    const memoryContext = await memoryService.buildContext(30);
    const context = {
      ...memoryContext,
      ...suppliedContext,
    };

    const result = await commandExecutorService.execute(query, context);

    return NextResponse.json({
      success: true,
      query,
      route: result.route,
      execution: result.execution,
      contextMemoryCount: Object.keys(memoryContext).length,
      durationMs: Date.now() - startedAt,
    });
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
