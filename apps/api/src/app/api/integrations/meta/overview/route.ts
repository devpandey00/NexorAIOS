import { NextResponse } from 'next/server';
import { MetaGraphClient, getMetaAdAccountId } from '@/lib/integrations/meta';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const client = new MetaGraphClient();
    const accountId = getMetaAdAccountId();
    const data = await client.get({
      path: accountId,
      params: {
        fields: 'id,name,account_status,currency,amount_spent,spend_cap',
      },
    });
    return NextResponse.json({ success: true, account: data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 503 },
    );
  }
}
