import { NextResponse } from 'next/server';
import { leadService } from '@nexor/core';
import { CreateLeadSchema } from '@/lib/validators/lead';

export async function GET() {
  try { return NextResponse.json(await leadService.findAll()); }
  catch (error) { return NextResponse.json({ success: false, message: error instanceof Error ? error.message : String(error) }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const body = CreateLeadSchema.parse(await request.json());
    const existing = await leadService.findAll({ search: body.businessName, page: 1, pageSize: 5 });
    const exact = existing.data.find((lead) => lead.businessName.toLowerCase() === body.businessName.toLowerCase());
    if (exact) return NextResponse.json({ success: true, duplicate: true, lead: exact }, { status: 200 });
    const lead = await leadService.create(body);
    return NextResponse.json({ success: true, duplicate: false, lead }, { status: 201 });
  } catch (error) {
    console.error('LEADS API ERROR:', error);
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
