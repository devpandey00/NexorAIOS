import { NextRequest, NextResponse } from 'next/server';
import { getDatabaseClients, OutreachChannel, OutreachStatus } from '@nexor/database';
import { outreachService } from '@nexor/ai';
import { NEXOR_BRAND } from '@nexor/shared';
import { getInternationalPricing } from '@/lib/international-pricing';
import { getSessionUser } from '@/lib/auth';
import { sendApprovedOutreach, getWhatsAppProviderStatus } from '@/lib/outreach-sender';

export const runtime = 'nodejs';
function getPrisma() { return getDatabaseClients().write; }
async function authorized(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const outreachSecret = process.env.OUTREACH_API_SECRET?.trim();
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (outreachSecret && auth === `Bearer ${outreachSecret}`) return true;
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;
  return Boolean(await getSessionUser(req));
}
const JOB_OR_CONTENT_PATTERNS = [/\bjobs?\b/i,/\bvacanc(?:y|ies)\b/i,/\bcareers?\b/i,/\bhiring\b/i,/\bsalary\b/i,/\bapply now\b/i,/\bresume\b/i,/\bcv\b/i,/\binternship\b/i,/\brecruitment\b/i,/\btop\b/i,/\bbest\b/i,/\blist\b/i,/\bdirectory\b/i,/\bguide\b/i,/\broundup\b/i,/\barticle\b/i,/\bnews\b/i,/\bhow to\b/i];
const NON_BUSINESS_PATHS = /\/(jobs?|careers?|vacancies|blog|article|news|category|tag|search|directory|listing|forum|forums)(\/|$)/i;
const VALID_LEAD_TYPES = new Set(['BUSINESS','COMPANY','LOCAL_BUSINESS','AGENCY','PROFESSIONAL_SERVICE']);
const BLOCKED_SOURCES = new Set(['JOB','JOB_SEARCH','JOB-SEARCH','RECRUITMENT','CAREER','JOB_PORTAL']);
function parseNotes(notes: string | null) { if (!notes) return {} as Record<string, any>; try { const parsed = JSON.parse(notes); return parsed && typeof parsed === 'object' ? parsed as Record<string, any> : {}; } catch { return {}; } }
function leadEligibility(lead: { businessName: string; website: string | null; notes: string | null }) {
  const parsed = parseNotes(lead.notes); const metadata = parsed.metadata ?? parsed;
  const leadType = typeof metadata.leadType === 'string' ? metadata.leadType.toUpperCase() : '';
  const source = typeof metadata.source === 'string' ? metadata.source.toUpperCase() : '';
  const name = lead.businessName.trim();
  if (!name || JOB_OR_CONTENT_PATTERNS.some((p) => p.test(name))) return { ok:false, reason:'Not an operational business lead' };
  if (BLOCKED_SOURCES.has(source) || (leadType && !VALID_LEAD_TYPES.has(leadType))) return { ok:false, reason:`Blocked lead type/source: ${leadType || 'unknown'} / ${source || 'unknown'}` };
  if (lead.website) { try { if (NON_BUSINESS_PATHS.test(new URL(lead.website).pathname)) return { ok:false, reason:'Website is a job/content/listing page' }; } catch { return { ok:false, reason:'Invalid lead website' }; } }
  return { ok:true, reason:'Operational business lead', leadType:leadType || 'BUSINESS', source:source || 'UNKNOWN' };
}
function researchContext(notes: string | null) { const parsed = parseNotes(notes); return { research:parsed.research ?? {}, score:parsed.score ?? {} }; }
function jsonError(message:string,status=400) { return NextResponse.json({success:false,error:message},{status}); }
function fallbackWhatsAppDraft(lead:{businessName:string;ownerName:string|null}, research:Record<string,any>) {
  const findings=[...(Array.isArray(research.weaknesses)?research.weaknesses:[]),...(Array.isArray(research.opportunities)?research.opportunities:[])];
  const verified=findings.find((x)=>x&&typeof x==='object'&&(x.basis==='verified'||x.confidence>=0.9)&&typeof x.finding==='string')?.finding;
  const greeting=lead.ownerName?.trim()?`Hi ${lead.ownerName.trim()},`:`Hi ${lead.businessName.trim()} team,`;
  const observation=verified?`One thing stood out in the research: ${verified}.`:`I came across ${lead.businessName.trim()} and wanted to share a practical growth idea.`;
  return `${greeting}\n\n${observation}\n\nI help businesses improve their website, Google/Meta Ads and lead generation. If you'd like, I can share a few specific suggestions for ${lead.businessName.trim()} without any obligation.\n\nBest,\n${NEXOR_BRAND.founder}\n${NEXOR_BRAND.name}`;
}
function automationReady() { const provider=getWhatsAppProviderStatus(); return { provider, ready:Boolean(provider.openwaConfigured || (provider.configured && provider.templateConfigured)) }; }
async function promoteReadyDrafts(prisma:any) {
  const { ready } = automationReady(); if (!ready) return 0;
  const candidates=await prisma.outreach.findMany({where:{channel:OutreachChannel.WHATSAPP,status:{in:[OutreachStatus.DRAFT,OutreachStatus.APPROVAL_REQUIRED]}},select:{id:true},take:100});
  if (!candidates.length) return 0;
  const scheduledAt=new Date(Date.now()+5*60*1000);
  const result=await prisma.outreach.updateMany({where:{id:{in:candidates.map((x:any)=>x.id)},status:{in:[OutreachStatus.DRAFT,OutreachStatus.APPROVAL_REQUIRED]}},data:{status:OutreachStatus.APPROVED,approvedAt:new Date(),scheduledAt,error:null}});
  return result.count;
}

export async function GET(req:NextRequest) {
  if (!(await authorized(req))) return jsonError('Unauthorized',401); const prisma=getPrisma();
  try {
    const oneDayAgo=new Date(Date.now()-86400000);
    const [draftsRaw,approved,scheduled,rawLeads,sent,failed,failedLast24h,recentFailedRaw]=await Promise.all([
      prisma.outreach.findMany({where:{channel:OutreachChannel.WHATSAPP,status:{in:[OutreachStatus.DRAFT,OutreachStatus.APPROVAL_REQUIRED]}},include:{lead:true},orderBy:{createdAt:'desc'},take:100}),
      prisma.outreach.findMany({where:{channel:OutreachChannel.WHATSAPP,status:OutreachStatus.APPROVED},include:{lead:true},orderBy:{approvedAt:'asc'},take:100}),
      prisma.outreach.findMany({where:{channel:OutreachChannel.WHATSAPP,status:OutreachStatus.SCHEDULED},include:{lead:true},orderBy:{scheduledAt:'asc'},take:100}),
      prisma.lead.findMany({where:{status:{in:['NEW','RESEARCHED','QUALIFIED','PITCH_READY']}},orderBy:{updatedAt:'desc'},take:100}),
      prisma.outreach.count({where:{channel:OutreachChannel.WHATSAPP,status:OutreachStatus.SENT}}),
      prisma.outreach.count({where:{channel:OutreachChannel.WHATSAPP,status:OutreachStatus.FAILED}}),
      prisma.outreach.count({where:{channel:OutreachChannel.WHATSAPP,status:OutreachStatus.FAILED,updatedAt:{gte:oneDayAgo}}}),
      prisma.outreach.findMany({where:{channel:OutreachChannel.WHATSAPP,status:OutreachStatus.FAILED},include:{lead:true},orderBy:{updatedAt:'desc'},take:20}),
    ]);
    const drafts=draftsRaw.filter((x:any)=>leadEligibility(x.lead).ok);
    const approvedValid=approved.filter((x:any)=>leadEligibility(x.lead).ok&&Boolean(x.lead.whatsapp));
    const existing=new Set([...draftsRaw,...approved,...scheduled].map((x:any)=>x.leadId));
    const rejected=[...draftsRaw,...approved,...scheduled].filter((x:any)=>!leadEligibility(x.lead).ok).map((x:any)=>({id:x.id,businessName:x.lead.businessName,reason:leadEligibility(x.lead).reason}));
    const notContactable=rawLeads.filter((x:any)=>leadEligibility(x).ok&&!x.whatsapp&&!existing.has(x.id)).slice(0,50).map((x:any)=>({id:x.id,businessName:x.businessName,reason:'NOT CONTACTABLE: WhatsApp number missing'}));
    const recentFailed=recentFailedRaw.map((x:any)=>({id:x.id,businessName:x.lead.businessName,reason:x.error??'Send failed',updatedAt:x.updatedAt.toISOString(),isRecent:x.updatedAt>=oneDayAgo}));
    const state=automationReady();
    return NextResponse.json({success:true,provider:{...state.provider,automationReady:state.ready},stats:{drafts:drafts.length,approved:approvedValid.length,scheduled:scheduled.length,sent,failed,failedLast24h,replies:0,notContactable:notContactable.length,rejected:rejected.length},drafts,approved:approvedValid,scheduled,rejected,notContactable,recentFailed});
  } catch(error) { return jsonError(error instanceof Error?error.message:String(error),500); }
}

export async function POST(req:NextRequest) {
  if (!(await authorized(req))) return jsonError('Unauthorized',401); const prisma=getPrisma();
  try {
    const body=await req.json(); const action=typeof body?.action==='string'?body.action:'';
    if (action==='run_due') {
      const now=new Date(); const limit=Math.min(Math.max(Number(body.limit??process.env.OUTREACH_MAX_PER_RUN??2),1),20);
      const candidates=await prisma.outreach.findMany({where:{channel:OutreachChannel.WHATSAPP,status:{in:[OutreachStatus.APPROVED,OutreachStatus.SCHEDULED]},scheduledAt:{lte:now}},orderBy:{scheduledAt:'asc'},take:Math.min(limit*5,100)});
      const leadIds=[...new Set(candidates.map((x:any)=>x.leadId))]; const leads=await prisma.lead.findMany({where:{id:{in:leadIds},whatsapp:{not:null}},select:{id:true,businessName:true}}); const names=new Map(leads.map((x:any)=>[x.id,x.businessName]));
      let sent=0,failed=0; const results:any[]=[];
      for (const item of candidates.filter((x:any)=>names.has(x.leadId)).slice(0,limit)) { try { const result=await sendApprovedOutreach(item.id); if(!result.alreadySent) sent++; results.push({id:item.id,businessName:names.get(item.leadId)??'Unknown',success:true}); } catch(error) { failed++; results.push({id:item.id,businessName:names.get(item.leadId)??'Unknown',success:false,error:error instanceof Error?error.message:String(error)}); } }
      return NextResponse.json({success:true,action,queued:candidates.length,sent,failed,results,ranAt:now.toISOString()});
    }
    if (action==='generate') {
      const limit=Math.min(Math.max(Number(body.limit??10),1),25); const ids=Array.isArray(body.leadIds)?body.leadIds.filter((x:unknown):x is string=>typeof x==='string'):[];
      const leads=await prisma.lead.findMany({where:{...(ids.length?{id:{in:ids}}:{}),status:{in:['NEW','RESEARCHED','QUALIFIED','PITCH_READY']},whatsapp:{not:null}},orderBy:{updatedAt:'desc'},take:100});
      const state=automationReady(); let created=0,skipped=0,autoApproved=0; const errors:string[]=[],rejected:string[]=[]; const generatedMessages=new Set<string>();
      for (const lead of leads) {
        if(created>=limit) break; const eligibility=leadEligibility(lead); if(!eligibility.ok){rejected.push(`${lead.businessName}: ${eligibility.reason}`);continue;}
        const existing=await prisma.outreach.findFirst({where:{leadId:lead.id,channel:OutreachChannel.WHATSAPP,status:{in:[OutreachStatus.DRAFT,OutreachStatus.APPROVAL_REQUIRED,OutreachStatus.APPROVED,OutreachStatus.SCHEDULED]}}}); if(existing){skipped++;continue;}
        const context=researchContext(lead.notes); const pricing=getInternationalPricing(lead.country); let message='';
        try {
          for(let attempt=0;attempt<2&&!message;attempt++) { try { const generated=await outreachService.generate({businessName:lead.businessName,ownerName:lead.ownerName,niche:lead.niche,country:lead.country,website:lead.website,whatsapp:lead.whatsapp,auditScore:lead.auditScore,notes:lead.notes,verifiedResearch:context.research,verifiedScore:context.score,leadMetadata:{leadType:eligibility.leadType,source:eligibility.source},internationalPricing:pricing,uniquenessInstruction:`Create a genuinely different WhatsApp message for ${lead.businessName}. Use one or two verified findings only. If a service is discussed, use only these standard ${pricing.currency} client-facing prices: website ${pricing.website}, Google Ads ${pricing.googleAds}/mo, Meta Ads ${pricing.metaAds}/mo, Google Business Profile setup ${pricing.googleBusinessProfile}, social media ${pricing.socialMedia}/mo. Ad spend is separate. Do not reveal INR or internal pricing.`}); const candidate=typeof generated?.whatsapp==='string'?generated.whatsapp.trim():''; if(candidate&&!generatedMessages.has(candidate.toLowerCase())) message=candidate; } catch(error) { if(attempt===1) errors.push(`${lead.businessName}: AI unavailable, used safe fallback`); } }
          if(!message) message=fallbackWhatsAppDraft(lead,context.research); generatedMessages.add(message.toLowerCase());
          const status=state.ready?OutreachStatus.APPROVED:OutreachStatus.DRAFT; const scheduledAt=state.ready?new Date(Date.now()+5*60*1000):null;
          await prisma.outreach.create({data:{leadId:lead.id,channel:OutreachChannel.WHATSAPP,status,message,approvedAt:state.ready?new Date():null,scheduledAt,error:null}}); created++; if(state.ready) autoApproved++;
        } catch(error) { errors.push(`${lead.businessName}: ${error instanceof Error?error.message:String(error)}`); }
      }
      const promoted=await promoteReadyDrafts(prisma); autoApproved+=promoted;
      return NextResponse.json({success:true,action,considered:leads.length,created,skipped,autoApproved,promoted,provider:state.provider,automationReady:state.ready,rejected,errors});
    }
    const ids=Array.isArray(body?.ids)?body.ids.filter((x:unknown):x is string=>typeof x==='string'):[]; if(!ids.length) return jsonError('ids are required');
    if(action==='approve') { const state=automationReady(); if(!state.ready) return jsonError(state.provider.templateConfigured?'WhatsApp provider is not ready.':'Meta cold outreach needs an approved WhatsApp template; configure WHATSAPP_TEMPLATE_NAME/LANGUAGE or use a ready OpenWA session.',409); const scheduledAt=new Date(Date.now()+5*60*1000); const result=await prisma.outreach.updateMany({where:{id:{in:ids},channel:OutreachChannel.WHATSAPP,status:{in:[OutreachStatus.DRAFT,OutreachStatus.APPROVAL_REQUIRED]}},data:{status:OutreachStatus.APPROVED,approvedAt:new Date(),scheduledAt,error:null}}); return NextResponse.json({success:true,action,updated:result.count,autoSendAt:scheduledAt}); }
    if(action==='cancel') { const result=await prisma.outreach.updateMany({where:{id:{in:ids},channel:OutreachChannel.WHATSAPP,status:{in:[OutreachStatus.DRAFT,OutreachStatus.APPROVAL_REQUIRED,OutreachStatus.APPROVED,OutreachStatus.SCHEDULED]}},data:{status:OutreachStatus.CANCELLED}}); return NextResponse.json({success:true,action,updated:result.count}); }
    return jsonError('Unknown action. Use generate, approve, run_due or cancel.');
  } catch(error) { return jsonError(error instanceof Error?error.message:String(error),500); }
}
