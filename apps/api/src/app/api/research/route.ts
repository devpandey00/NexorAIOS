import { NextRequest, NextResponse } from 'next/server';
import { researchService } from '@nexor/research';
import { businessReportService } from '@nexor/ai';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = typeof body?.url === 'string' ? body.url.trim() : '';

    if (!url) {
      return NextResponse.json(
        {
          success: false,
          error: 'URL is required',
        },
        { status: 400 },
      );
    }

    const research = await researchService.analyze(url);

    const report = await businessReportService.generate({
      url,
      research,
    });

    return NextResponse.json({
      success: true,
      result: {
        research,
        report,
      },
    });
  } catch (error) {
    console.error('RESEARCH API ERROR:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Research failed',
      },
      { status: 500 },
    );
  }
}
