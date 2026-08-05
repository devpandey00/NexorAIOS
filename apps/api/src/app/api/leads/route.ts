import { NextResponse } from 'next/server';
import { leadService } from '@nexor/core';
import { CreateLeadSchema } from '@/lib/validators/lead';

export async function GET() {
  try {
    const result = await leadService.findAll();

    return NextResponse.json(result);
  } catch (error) {
    console.error('LEADS API ERROR:', error);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : null,
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();

    const body = CreateLeadSchema.parse(json);

    const lead = await leadService.create(body);

    return NextResponse.json(
      {
        success: true,
        lead,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error('LEADS API ERROR:', error);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : null,
      },
      {
        status: 500,
      },
    );
  }
}
