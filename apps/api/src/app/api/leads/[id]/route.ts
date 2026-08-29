import { NextRequest, NextResponse } from 'next/server';
import { leadService } from '@nexor/core';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const lead = await leadService.findById(id);
    if (!lead) {
      return NextResponse.json({ success: false, message: 'Lead not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, lead });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const existing = await leadService.findById(id);
    if (!existing) {
      return NextResponse.json({ success: false, message: 'Lead not found' }, { status: 404 });
    }
    const deleted = await leadService.delete(id);
    return NextResponse.json({ success: true, deleted: deleted.id });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
