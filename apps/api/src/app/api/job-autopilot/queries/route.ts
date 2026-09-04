import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '../../../../lib/auth';

export const runtime = 'nodejs';

const secret = process.env.CRON_SECRET || process.env.OUTREACH_API_SECRET || '';
const roles = (process.env.JOB_TARGET_ROLES || 'Digital Marketing Specialist,Performance Marketing Specialist,SEO Specialist,Social Media Manager,Growth Marketing Specialist').split(',').map((value) => value.trim()).filter(Boolean);
const locations = (process.env.JOB_TARGET_LOCATIONS || 'India,Remote,Lucknow').split(',').map((value) => value.trim()).filter(Boolean);

async function authorized(req: NextRequest) {
  const cronAuthorized = secret.length > 0 && (
    req.headers.get('authorization') === `Bearer ${secret}` ||
    req.headers.get('x-cron-secret') === secret
  );
  if (cronAuthorized) return true;
  const sessionUser = await getSessionUser(req);
  return sessionUser !== null;
}

function buildQueries(inputRoles = roles, inputLocations = locations) {
  return inputLocations.flatMap((location) => inputRoles.flatMap((role) => [
    `"${role}" "${location}" jobs hiring`,
    `"${role}" "${location}" apply`,
    `site:linkedin.com/jobs "${role}" "${location}"`,
    `site:indeed.com "${role}" "${location}"`,
    `site:naukri.com "${role}" "${location}"`,
  ])).slice(0, 40);
}

export async function GET(req: NextRequest) {
  if (!await authorized(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const queries = buildQueries();
  return NextResponse.json({ success: true, queries, roles, locations, count: queries.length });
}

export async function POST(req: NextRequest) {
  if (!await authorized(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const requestedRoles = Array.isArray(body.roles)
    ? body.roles.filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0).map((value) => value.trim())
    : roles;
  const requestedLocations = Array.isArray(body.locations)
    ? body.locations.filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0).map((value) => value.trim())
    : locations;
  const queries = buildQueries(requestedRoles, requestedLocations);
  return NextResponse.json({ success: true, queries, roles: requestedRoles, locations: requestedLocations, count: queries.length });
}

// Query generation is authenticated for both browser sessions and cron callers.
