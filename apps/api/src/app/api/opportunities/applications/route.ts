import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { listJobApplications, saveJobApplication, updateJobApplication } from '@/lib/opportunity-workflow';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try { return NextResponse.json({ success: true, applications: await listJobApplications() }); }
  catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const title = String(body.title || '').trim();
    if (!title) throw new Error('title is required');
    const id = await saveJobApplication({ title, company: body.company ? String(body.company) : undefined, url: body.url ? String(body.url) : undefined, location: body.location ? String(body.location) : undefined, budget: body.budget ? String(body.budget) : undefined, requirements: body.requirements ? String(body.requirements) : undefined, deadline: body.deadline ? String(body.deadline) : undefined, matchScore: body.matchScore, application: body.application ? String(body.application) : undefined, coverLetter: body.coverLetter ? String(body.coverLetter) : undefined, createdBy: user.id });
    if (!id) return NextResponse.json({ success: false, error: 'Duplicate opportunity URL' }, { status: 409 });
    return NextResponse.json({ success: true, id, status: 'SAVED' }, { status: 201 });
  } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 }); }
}

export async function PATCH(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try { const body = await request.json(); if (!body.id || !body.status) throw new Error('id and status are required'); await updateJobApplication(String(body.id), String(body.status).toUpperCase(), user.id); return NextResponse.json({ success: true, id: body.id, status: String(body.status).toUpperCase() }); }
  catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 400 }); }
}
