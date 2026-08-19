import { NextResponse } from 'next/server';
import { toolRegistry, registerDefaultTools } from '@nexor/tools';

export async function GET() {
  try {
    registerDefaultTools();
    const tools = toolRegistry.list().map((tool) => ({ id: tool.id, name: tool.name, category: tool.category }));
    return NextResponse.json({ success: true, status: 'operational', tools, timestamp: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ success: false, status: 'degraded', error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
