import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClients } from '@nexor/database';

export const runtime = 'nodejs';

const db = getDatabaseClients().write;

const PORTALS = ['linkedin.com', 'indeed.com', 'naukri.com', 'internshala.com', 'cutshort.io', 'wellfound.com'];

function isJobPortalUrl(url: string) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return PORTALS.some((portal) => host === portal || host.endsWith(`.${portal}`));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const id = typeof body.id === 'string' ? body.id : '';
    if (!id) throw new Error('id is required');

    const rows = await db.$queryRaw<Array<{
      id: string;
      kind: string;
      url: string;
      application_url: string | null;
      application_status: string;
    }>>`
      SELECT id, kind, url, application_url, application_status
      FROM public.opportunities
      WHERE id = ${id}::uuid
      LIMIT 1
    `;

    const opportunity = rows[0];
    if (!opportunity) return NextResponse.json({ success: false, error: 'Opportunity not found' }, { status: 404 });
    if (opportunity.kind !== 'JOB') throw new Error('Only JOB opportunities can be applied to');

    const applicationUrl = opportunity.application_url ?? opportunity.url;
    if (!isJobPortalUrl(applicationUrl)) {
      return NextResponse.json({
        success: false,
        error: 'Application URL is not a supported job portal URL',
        applicationUrl,
      }, { status: 400 });
    }

    await db.$executeRaw`
      UPDATE public.opportunities
      SET application_status = 'QUEUED', application_url = ${applicationUrl}, application_error = NULL, updated_at = now()
      WHERE id = ${id}::uuid
    `;

    return NextResponse.json({
      success: true,
      status: 'QUEUED',
      applicationUrl,
      nextStep: 'Open the portal with an authenticated browser session and submit the application form.',
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
