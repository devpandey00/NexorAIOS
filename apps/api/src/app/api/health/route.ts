import { NextResponse } from 'next/server';
import { connectDatabase } from '@nexor/database';

export async function GET() {
  try {
    await connectDatabase();

    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      service: 'NexorAIOS API',
      version: '0.0.0',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 500,
      },
    );
  }
}
