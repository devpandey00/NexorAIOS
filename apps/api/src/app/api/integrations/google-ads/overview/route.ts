import { NextResponse } from 'next/server';
import { GoogleAdsClient } from '@/lib/integrations/google-ads';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const client = new GoogleAdsClient();
    const data = await client.search({
      query:
        'SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.time_zone, customer.manager FROM customer LIMIT 1',
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 503 },
    );
  }
}
