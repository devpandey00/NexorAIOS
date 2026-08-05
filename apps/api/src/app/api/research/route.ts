import { NextRequest, NextResponse } from 'next/server';
import { researchService } from '@nexor/research';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json(
        {
          success: false,
          error: 'URL is required',
        },
        {
          status: 400,
        },
      );
    }

    const result = await researchService.analyze(url);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        error: 'Research failed',
      },
      {
        status: 500,
      },
    );
  }
}
