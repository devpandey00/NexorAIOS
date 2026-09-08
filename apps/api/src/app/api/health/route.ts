import { NextResponse } from 'next/server';
import { connectDatabase } from '@nexor/database';

export async function GET() {
  const deploymentCommit = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? 'unknown';
  try {
    await connectDatabase();
    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      service: 'NexorAIOS API',
      version: '0.0.0',
      commit: deploymentCommit,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        database: 'disconnected',
        service: 'NexorAIOS API',
        commit: deploymentCommit,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
