import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClients, OutreachChannel, OutreachStatus } from '@nexor/database';
import { authorizeMachineRequest } from '@/lib/machine-auth';
import { getWhatsAppProviderStatus } from '@/lib/outreach-sender';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  if (!(await authorizeMachineRequest(req))) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const prisma = getDatabaseClients().write;
    const drafts = await prisma.outreach.findMany({
      where: {
        channel: OutreachChannel.WHATSAPP,
        status: OutreachStatus.APPROVAL_REQUIRED,
      },
      select: {
        id: true,
        lead: { select: { id: true, businessName: true, country: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    const provider = getWhatsAppProviderStatus();
    const automationReady = Boolean(provider.openwaConfigured || (provider.configured && provider.templateConfigured));

    return NextResponse.json({
      success: true,
      count: drafts.length,
      provider: { ...provider, automationReady },
      drafts: drafts.map((draft) => ({
        id: draft.id,
        leadId: draft.lead.id,
        businessName: draft.lead.businessName,
        country: draft.lead.country,
      })),
    });
  } catch (error) {
    console.error('[WHATSAPP PENDING ERROR]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
