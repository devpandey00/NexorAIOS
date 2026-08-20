import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClients, JobStatus, JobType } from '@nexor/database';

const db = getDatabaseClients().write;
const secret = process.env.CRON_SECRET || process.env.OUTREACH_API_SECRET || '';
const profile = {
  name: process.env.JOB_APPLICANT_NAME || 'Diwakar Pandey',
  email: process.env.JOB_APPLICANT_EMAIL || '',
  phone: process.env.JOB_APPLICANT_PHONE || '',
  portfolio: process.env.JOB_PORTFOLIO_URL || '',
  resume: process.env.JOB_RESUME_URL || '',
  roles: (process.env.JOB_TARGET_ROLES || 'Digital Marketing Specialist,Performance Marketing Specialist,SEO Specialist,Social Media Manager,Growth Marketing Specialist').split(',').map(s => s.trim()).filter(Boolean),
  skills: (process.env.JOB_SKILLS || 'Google Ads,Meta Ads,SEO,Local SEO,Lead Generation,Social Media Marketing,Website Development,Canva,Google Analytics,Search Console,GTM,AI tools').split(',').map(s => s.trim()).filter(Boolean),
};
const locations = (process.env.JOB_TARGET_LOCATIONS || 'India,Remote,Lucknow').split(',').map(s => s.trim()).filter(Boolean);

function authorized(req: NextRequest) {
  if (!secret) return true;
  return req.headers.get('authorization') === `Bearer ${secret}` || req.headers.get('x-cron-secret') === secret;
}
function domain(url: string) { try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } }
function score(title: string, text: string) {
  const hay = `${title} ${text}`.toLowerCase(); let value = 0;
  profile.roles.forEach(role => role.toLowerCase().split(/\s+/).filter(w => w.length > 3).forEach(w => { if (hay.includes(w)) value += 9; }));
  profile.skills.forEach(skill => { if (hay.includes(skill.toLowerCase())) value += 3; });
  if (/remote/.test(hay)) value += 8; if (/intern|fresher|entry level|0-2 years|1-2 years/.test(hay)) value += 8; if (/unpaid|commission only/.test(hay)) value -= 20;
  return Math.max(0, Math.min(100, value));
}
function emailFrom(text: string) { return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || ''; }
async function html(url: string) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 7000);
  try { const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 NexorAIOS Job Autopilot' }, cache: 'no-store', signal: controller.signal }); return r.ok ? (await r.text()).replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 12000) : ''; } catch { return ''; } finally { clearTimeout(timer); }
}
async function searchJobs() {
  const queries = locations.flatMap(location => profile.roles.flatMap(role => [`"${role}" "${location}" jobs hiring`, `"${role}" "${location}" apply`, `site:linkedin.com/jobs "${role}" "${location}"`, `site:indeed.com "${role}" "${location}"`, `site:naukri.com "${role}" "${location}"`])).slice(0, 30);
  const pages = await Promise.allSettled(queries.map(async q => { const r = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}&kl=in-en`, { headers: { 'User-Agent': 'Mozilla/5.0 NexorAIOS Job Autopilot' }, cache: 'no-store' }); return r.ok ? r.text() : ''; }));
  const found: { title: string; url: string; source: string }[] = []; const seen = new Set<string>();
  const re = /<a[^>]+class="[^\"]*result__a[^\"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  for (const page of pages) { if (page.status !== 'fulfilled') continue; let m: RegExpExecArray | null; while ((m = re.exec(page.value)) && found.length < 60) {
    let url = m[1]; try { if (url.startsWith('//')) url = `https:${url}`; const u = new URL(url); if (u.hostname.includes('duckduckgo.com') && u.searchParams.has('uddg')) url = decodeURIComponent(u.searchParams.get('uddg')!); } catch { continue; }
    const title = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); const d = domain(url); const key = url.split('#')[0];
    if (!url.startsWith('http') || !title || !d || seen.has(key) || /best|top|list|directory|salary|guide|blog|news|course|training/i.test(title)) continue;
    seen.add(key); found.push({ title, url, source: d });
  }}
  return found;
}
async function draft(job: { title: string; company: string; text: string }) {
  const body = `Hi,\n\nI’m ${profile.name} and I’m interested in the ${job.title} opportunity at ${job.company}. My relevant skills include ${profile.skills.slice(0, 7).join(', ')}.\n\nPortfolio: ${profile.portfolio || '[configure JOB_PORTFOLIO_URL]'}\nResume: ${profile.resume || '[configure JOB_RESUME_URL]'}\n\nI’d be glad to discuss the role and how I can contribute.\n\nRegards,\n${profile.name}`;
  return { subject: `Application — ${job.title}`, body };
}
async function discover() {
  const results = await searchJobs(); let created = 0;
  const recent = await db.job.findMany({ where: { type: JobType.ANALYTICS }, orderBy: { createdAt: 'desc' }, take: 300 });
  const seen = new Set(recent.map(j => (j.payload as any)?.url).filter(Boolean));
  for (const item of results) {
    if (seen.has(item.url)) continue; const text = await html(item.url); const s = score(item.title, text); const contactEmail = emailFrom(text); const company = item.title.split(/\s+[|·–—-]\s+/)[0].trim() || item.source;
    const application = await draft({ title: item.title, company, text }); const state = s >= 55 ? 'READY_TO_APPLY' : 'REVIEW';
    await db.job.create({ data: { type: JobType.ANALYTICS, status: JobStatus.QUEUED, payload: { kind: 'JOB_OPPORTUNITY', title: item.title, company, url: item.url, source: item.source, score: s, contactEmail, research: text.slice(0, 5000), application, applicationState: state, discoveredAt: new Date().toISOString() }, result: { score: s, applicationState: state } } });
    seen.add(item.url); created++; if (created >= 40) break;
  }
  return { discovered: results.length, created };
}
async function apply(limit = 10) {
  const jobs = await db.job.findMany({ where: { type: JobType.ANALYTICS, status: { in: [JobStatus.QUEUED, JobStatus.RETRYING] } }, orderBy: { createdAt: 'asc' }, take: 150 }); let applied = 0; let confirmation = 0;
  for (const job of jobs) {
    const p = (job.payload || {}) as any; if (p.kind !== 'JOB_OPPORTUNITY' || ['APPLIED', 'REJECTED'].includes(p.applicationState)) continue;
    if (!p.contactEmail || !process.env.RESEND_API_KEY || !profile.email) { await db.job.update({ where: { id: job.id }, data: { payload: { ...p, applicationState: 'NEEDS_CONFIRMATION', confirmationReason: !p.contactEmail ? 'No verified application email found' : 'Email provider/profile not configured' } } }); confirmation++; continue; }
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.JOB_FROM_EMAIL || profile.email, to: p.contactEmail, reply_to: profile.email, subject: p.application.subject, text: p.application.body }) });
    if (response.ok) { await db.job.update({ where: { id: job.id }, data: { status: JobStatus.COMPLETED, payload: { ...p, applicationState: 'APPLIED', appliedAt: new Date().toISOString() }, result: { applicationState: 'APPLIED', provider: 'resend' } } }); applied++; } else { await db.job.update({ where: { id: job.id }, data: { status: JobStatus.RETRYING, error: `Application provider returned ${response.status}` } }); }
    if (applied >= limit) break;
  }
  return { applied, confirmation };
}
export async function GET(req: NextRequest) { if (!authorized(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }); const jobs = await db.job.findMany({ where: { type: JobType.ANALYTICS }, orderBy: { createdAt: 'desc' }, take: 250 }); return NextResponse.json({ success: true, profile, jobs: jobs.map(j => ({ id: j.id, ...((j.payload || {}) as any), status: j.status, error: j.error })).filter(j => j.kind === 'JOB_OPPORTUNITY') }); }
export async function POST(req: NextRequest) { if (!authorized(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }); try { const body = await req.json().catch(() => ({})); const result = body.mode === 'discover' ? await discover() : body.mode === 'apply' ? await apply(Number(body.limit || 10)) : { discovery: await discover(), application: await apply(Number(body.limit || 10)) }; return NextResponse.json({ success: true, result }); } catch (error) { return NextResponse.json({ success: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 }); } }
export async function PATCH(req: NextRequest) { if (!authorized(req)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }); const { id, action } = await req.json(); if (!id || !['approve', 'reject'].includes(action)) return NextResponse.json({ success: false, error: 'id and action are required' }, { status: 400 }); const job = await db.job.findUnique({ where: { id } }); if (!job) return NextResponse.json({ success: false, error: 'Opportunity not found' }, { status: 404 }); const p = (job.payload || {}) as any; await db.job.update({ where: { id }, data: { payload: { ...p, applicationState: action === 'approve' ? 'READY_TO_APPLY' : 'REJECTED', approvedAt: action === 'approve' ? new Date().toISOString() : null } } }); return NextResponse.json({ success: true }); }
