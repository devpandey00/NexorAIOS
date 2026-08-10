import { NextRequest, NextResponse } from 'next/server';
import { researchService } from '@nexor/research';
import { businessReportService } from '@nexor/ai';

export async function POST(req: NextRequest) {
  try {
    const { website } = await req.json();

    if (!website) {
      return NextResponse.json(
        {
          success: false,
          error: 'Website is required',
        },
        { status: 400 },
      );
    }

    const research = await researchService.analyze(website);

    if (!research.success) {
      return NextResponse.json(
        {
          success: false,
          error: research.error ?? 'Research failed',
        },
        { status: 422 },
      );
    }

    const report = await businessReportService.generate(research);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error) {
    console.error('LEAD ANALYSIS ERROR:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
