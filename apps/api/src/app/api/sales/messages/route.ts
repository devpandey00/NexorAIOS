import { NextRequest, NextResponse } from 'next/server';
import { buildSalesMessage, buildSalesSequence, type SalesMessageChannel } from '@/lib/sales-message-engine';

export const runtime = 'nodejs';

const channels = new Set<SalesMessageChannel>(['WHATSAPP', 'EMAIL', 'INSTAGRAM', 'FACEBOOK', 'LINKEDIN']);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const channel = String(body.channel || 'WHATSAPP').toUpperCase() as SalesMessageChannel;
    if (!channels.has(channel)) throw new Error('Unsupported sales channel');
    const input = {
      businessName: String(body.businessName || '').trim(),
      country: body.country == null ? null : String(body.country),
      website: body.website == null ? null : String(body.website),
      service: body.service == null ? null : String(body.service),
      requirement: body.requirement == null ? null : String(body.requirement),
      findings: Array.isArray(body.findings) ? body.findings.filter((x: unknown): x is string => typeof x === 'string').slice(0, 5) : [],
      channel,
      contactName: body.contactName == null ? null : String(body.contactName),
    } as const;
    if (!input.businessName) throw new Error('businessName is required');
    if (body.sequence) return NextResponse.json({ success: true, sequence: buildSalesSequence(input) });
    const stage = String(body.stage || 'FIRST_TOUCH').toUpperCase() as 'FIRST_TOUCH' | 'FOLLOW_UP_1' | 'FOLLOW_UP_2' | 'BREAKUP';
    return NextResponse.json({ success: true, message: buildSalesMessage({ ...input, stage }) });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
