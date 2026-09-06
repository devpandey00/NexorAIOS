'use client';

import { useCallback, useEffect, useState } from 'react';

type Lead = { id: string; businessName: string; whatsapp: string | null };
type Draft = { id: string; message: string; status: string; scheduledAt: string | null; lead: Lead };
type FailedItem = { id: string; businessName: string; reason: string; updatedAt: string; isRecent: boolean };
type Provider = { configured: boolean; mode: string; openwaConfigured: boolean; templateConfigured: boolean; templateLanguage: string; automationReady?: boolean };
type Data = { provider: Provider; stats: { drafts:number; approved:number; scheduled:number; sent:number; failed:number; failedLast24h:number; replies:number; notContactable:number; rejected:number }; drafts:Draft[]; approved:Draft[]; scheduled:Draft[]; notContactable:Array<{id:string;businessName:string;reason:string}>; recentFailed:FailedItem[] };

const statLabels: Record<string,string> = { sent:'Sent', approved:'Queued', scheduled:'Scheduled', drafts:'Drafts', failed:'Failed', failedLast24h:'Failed 24h', replies:'Replies', notContactable:'No WhatsApp' };

export default function WhatsAppAutomationPage() {
  const [data,setData]=useState<Data|null>(null);
  const [loading,setLoading]=useState(true);
  const [running,setRunning]=useState(false);
  const [message,setMessage]=useState('');

  const load=useCallback(async()=>{
    try {
      const response=await fetch('/api/whatsapp/automation',{cache:'no-store'}); const json=await response.json();
      if(!response.ok||!json.success) throw new Error(json.error??'Unable to load automation');
      setData(json); setMessage('');
    } catch(error) { setMessage(error instanceof Error?error.message:String(error)); }
    finally { setLoading(false); }
  },[]);

  useEffect(()=>{ void load(); const timer=window.setInterval(()=>void load(),20000); return ()=>window.clearInterval(timer); },[load]);

  async function run(action:string) {
    setRunning(true); setMessage('');
    try {
      const response=await fetch('/api/whatsapp/automation',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,limit:10})});
      const json=await response.json(); if(!response.ok||!json.success) throw new Error(json.error??'Automation action failed');
      setMessage(action==='generate'?`Automation checked leads: ${json.created??0} new, ${json.autoApproved??0} queued automatically.`:`Automation sent ${json.sent??0}; ${json.failed??0} failed.`);
      await load();
    } catch(error) { setMessage(error instanceof Error?error.message:String(error)); }
    finally { setRunning(false); }
  }

  const provider=data?.provider;
  const ready=Boolean(provider?.automationReady);
  const templateReady=Boolean(provider?.templateConfigured);
  const openwa=Boolean(provider?.openwaConfigured);
  const blocker=!ready && !openwa ? 'Meta first-contact outreach is blocked until an approved WhatsApp message template is configured.' : '';

  return <main className="mx-auto w-full max-w-5xl space-y-4 px-3 py-3 sm:space-y-5 sm:px-5 sm:py-5">
    <section className="nexor-panel overflow-hidden p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><div className="font-mono text-[7px] tracking-[0.16em] text-[var(--accent)]">WHATSAPP AUTOPILOT</div><h1 className="mt-1 text-lg font-semibold leading-tight sm:text-xl">Hands-free outreach</h1><p className="mt-2 text-[9px] leading-5 text-[var(--text-muted)]">Nexor discovers → researches → drafts → queues → sends → follows up automatically. No approval click required.</p></div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[7px] font-bold ${ready?'bg-emerald-500/15 text-emerald-400':'bg-amber-500/15 text-amber-400'}`}>{ready?'AUTOPILOT ON':'WAITING'}</span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className={`rounded-xl border p-3 ${provider?.configured?'border-emerald-500/25 bg-emerald-500/5':'border-red-500/25 bg-red-500/5'}`}><div className="text-[8px] font-semibold">PROVIDER</div><div className="mt-1 text-[9px]">{openwa?'OpenWA':'Meta Cloud API'} {provider?.configured?'connected':'not configured'}</div></div>
        <div className={`rounded-xl border p-3 ${ready?'border-emerald-500/25 bg-emerald-500/5':'border-amber-500/25 bg-amber-500/5'}`}><div className="text-[8px] font-semibold">FIRST CONTACT</div><div className="mt-1 text-[9px]">{openwa?'OpenWA session ready':templateReady?`Approved template · ${provider?.templateLanguage??'en_US'}`:'Template required for Meta cold outreach'}</div></div>
      </div>
      {blocker&&<div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-[8px] leading-4 text-amber-200">{blocker} Nexor will keep researching and preparing eligible leads, but it will not falsely mark a message as sent.</div>}
    </section>

    <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
      {Object.entries(data?.stats??{}).filter(([key])=>key!=='rejected').map(([key,value])=><div key={key} className="nexor-panel min-w-0 p-3"><div className="truncate text-[7px] uppercase tracking-[0.1em] text-[var(--text-muted)]">{statLabels[key]??key}</div><div className="mt-1 text-xl font-semibold">{value}</div></div>)}
    </section>

    <section className="nexor-panel p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-[10px] font-semibold">Automation status</div><div className="mt-1 text-[8px] leading-4 text-[var(--text-muted)]">GitHub worker checks this pipeline every 5 minutes. The page refreshes every 20 seconds.</div></div><button type="button" disabled={running||loading} onClick={()=>void run('generate')} className="w-full rounded-lg bg-[var(--accent)] px-4 py-3 text-[8px] font-bold text-black disabled:opacity-50 sm:w-auto">RUN AUTOPILOT NOW</button></div>
      {message&&<div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-[8px] leading-4">{message}</div>}
    </section>

    <section className="nexor-panel overflow-hidden"><div className="border-b border-[var(--border)] p-4"><div className="text-[10px] font-semibold">Send queue</div><div className="mt-1 text-[8px] text-[var(--text-muted)]">Only approved, due messages are sent. The worker handles this automatically.</div></div><div className="divide-y divide-[var(--border)]">{(data?.approved??[]).map(item=><article key={item.id} className="p-4"><div className="flex min-w-0 gap-3"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] text-emerald-400">✓</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="text-[9px]">{item.lead.businessName}</strong><span className="max-w-full break-all rounded bg-[var(--surface-2)] px-2 py-1 font-mono text-[7px]">{item.lead.whatsapp}</span></div><div className="mt-2 whitespace-pre-wrap break-words text-[8px] leading-5 text-[var(--text-secondary)]">{item.message}</div><div className="mt-2 text-[7px] text-[var(--text-muted)]">Due {item.scheduledAt?new Date(item.scheduledAt).toLocaleString():'now'}</div></div></div></article>)}{!data?.approved?.length&&<div className="p-8 text-center text-[8px] text-[var(--text-muted)]">Queue is clear. Nexor will add and send eligible leads automatically.</div>}</div></section>

    <section className="nexor-panel overflow-hidden"><div className="flex items-center justify-between gap-3 border-b border-[var(--border)] p-4"><div><div className="text-[10px] font-semibold">Recent failures</div><div className="mt-1 text-[8px] text-[var(--text-muted)]">{data?.stats?.failedLast24h??0} in the last 24 hours</div></div></div><div className="divide-y divide-[var(--border)]">{(data?.recentFailed??[]).slice(0,10).map(item=><div key={item.id} className="p-4"><div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"><strong className="text-[9px]">{item.businessName}</strong><span className="text-[7px] text-red-400">{item.isRecent?'RECENT':'HISTORICAL'}</span></div><div className="mt-1 break-words text-[8px] leading-4 text-[var(--text-muted)]">{item.reason}</div></div>)}{!data?.recentFailed?.length&&<div className="p-8 text-center text-[8px] text-[var(--text-muted)]">No failed sends.</div>}</div></section>

    <section className="nexor-panel p-4"><div className="text-[10px] font-semibold">Contactability</div><div className="mt-1 text-[8px] text-[var(--text-muted)]">{data?.stats?.notContactable??0} eligible businesses currently have no WhatsApp number. Nexor will not invent or guess one.</div></section>
  </main>;
}
