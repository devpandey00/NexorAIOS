'use client';

import { ChangeEvent, useMemo, useState } from 'react';

type Lead = {
  id: string;
  name: string;
  niche: string;
  phone: string;
  website?: string;
  location?: string;
  status: 'NEW' | 'RESEARCHED' | 'QUALIFIED' | 'SENT' | 'SKIPPED';
  score?: number;
  whatsappVerified?: boolean;
  message?: string;
  finding?: string;
};

const demoLeads: Lead[] = [
  {
    id: 'demo-1',
    name: 'Tender Palm Super Speciality Hospital',
    niche: 'Hospital',
    phone: '+91 9076972161',
    website: 'https://www.tenderpalm.com/',
    location: 'Lucknow',
    status: 'RESEARCHED',
    score: 91,
    whatsappVerified: true,
    finding: 'Existing website; strong service depth; conversion and paid-traffic optimisation opportunity.',
  },
  {
    id: 'demo-2',
    name: 'Aashirvad Superspeciality Hospital',
    niche: 'Hospital',
    phone: '+91 9415669734',
    website: 'https://www.aashirvadhospital.in/',
    location: 'Lucknow',
    status: 'RESEARCHED',
    score: 96,
    whatsappVerified: true,
    finding: 'Existing site with visible content/template issues; strong redesign + Ads opportunity.',
  },
  {
    id: 'demo-3',
    name: 'Sun Rise Medicare Hospital',
    niche: 'Hospital',
    phone: '+91 9054089814',
    location: 'Lucknow',
    status: 'NEW',
  },
];

function normalisePhone(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
  return value.trim();
}

function parseCsv(text: string): Lead[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const parse = (line: string) => {
    const out: string[] = [];
    let current = '';
    let quoted = false;
    for (const char of line) {
      if (char === '"') quoted = !quoted;
      else if (char === ',' && !quoted) {
        out.push(current.trim());
        current = '';
      } else current += char;
    }
    out.push(current.trim());
    return out;
  };
  const first = parse(lines[0]).map((v) => v.toLowerCase());
  const hasHeader = first.some((v) => ['name', 'business', 'phone', 'website'].includes(v));
  const rows = hasHeader ? lines.slice(1) : lines;
  const idx = (names: string[]) => {
    const found = first.findIndex((v) => names.includes(v));
    return found < 0 ? undefined : found;
  };
  const nameIndex = idx(['name', 'business', 'business name']) ?? 0;
  const phoneIndex = idx(['phone', 'mobile', 'number', 'whatsapp']) ?? 1;
  const nicheIndex = idx(['niche', 'category', 'industry']) ?? 2;
  const websiteIndex = idx(['website', 'url', 'site']);
  return rows.map((line, i) => {
    const cols = parse(line);
    return {
      id: `import-${i}-${Date.now()}`,
      name: cols[nameIndex] || 'Unnamed lead',
      phone: normalisePhone(cols[phoneIndex] || ''),
      niche: cols[nicheIndex] || 'Business',
      website: websiteIndex === undefined ? undefined : cols[websiteIndex],
      status: 'NEW',
    };
  });
}

export default function Home() {
  const [leads, setLeads] = useState<Lead[]>(demoLeads);
  const [selected, setSelected] = useState<string>(demoLeads[0].id);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>(['System ready. Autopilot is idle.']);
  const current = leads.find((lead) => lead.id === selected) ?? leads[0];
  const stats = useMemo(
    () => ({
      total: leads.length,
      qualified: leads.filter((l) => l.status === 'QUALIFIED').length,
      drafts: leads.filter((l) => Boolean(l.message)).length,
      high: leads.filter((l) => (l.score ?? 0) >= 80).length,
      sent: leads.filter((l) => l.status === 'SENT').length,
    }),
    [leads],
  );

  async function researchLead(lead: Lead) {
    setLog((items) => [`Researching ${lead.name}…`, ...items].slice(0, 8));
    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(lead),
      });
      const data = await response.json();
      setLeads((items) =>
        items.map((item) =>
          item.id === lead.id
            ? {
                ...item,
                status: data.whatsappVerified ? 'QUALIFIED' : 'RESEARCHED',
                score: data.score,
                whatsappVerified: data.whatsappVerified,
                message: data.message,
                finding: data.finding,
              }
            : item,
        ),
      );
      setLog((items) => [`${lead.name}: research complete`, ...items].slice(0, 8));
    } catch {
      setLog((items) => [`${lead.name}: research failed`, ...items].slice(0, 8));
    }
  }

  async function runAutopilot() {
    if (running) return;
    setRunning(true);
    setLog((items) => ['AUTOPILOT started — research → qualify → draft → send-ready.', ...items].slice(0, 8));
    for (const lead of leads.filter((l) => l.status === 'NEW')) await researchLead(lead);
    setRunning(false);
    setLog((items) => ['AUTOPILOT finished. Only verified WhatsApp leads are eligible for sending.', ...items].slice(0, 8));
  }

  async function sendCurrent() {
    if (!current?.whatsappVerified || !current.message) return;
    const response = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phone: current.phone, message: current.message, leadId: current.id }),
    });
    const data = await response.json();
    if (data.sent) {
      setLeads((items) => items.map((l) => (l.id === current.id ? { ...l, status: 'SENT' } : l)));
      setLog((items) => [`WhatsApp sent to ${current.name}`, ...items].slice(0, 8));
    } else {
      setLog((items) => [`WhatsApp not sent: ${data.error ?? 'provider not configured'}`, ...items].slice(0, 8));
    }
  }

  function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const imported = parseCsv(String(reader.result ?? ''));
      setLeads(imported.length ? imported : demoLeads);
      setSelected(imported[0]?.id ?? demoLeads[0].id);
      setLog((items) => [`Imported ${imported.length} leads.`, ...items].slice(0, 8));
    };
    reader.readAsText(file);
  }

  return (
    <main className="min-h-screen bg-[#f7f6f2] text-[#171717]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[270px] shrink-0 border-r border-[#e7e3da] bg-[#fbfaf7] p-5 lg:block">
          <div className="flex items-center gap-3 border-b border-[#e7e3da] pb-6">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-[#d8b878] text-lg font-semibold">N</div>
            <div><div className="font-semibold tracking-[.28em]">NEXOR</div><div className="text-[9px] tracking-[.25em] text-[#999]">AI OPERATING SYSTEM</div></div>
          </div>
          <div className="mt-8 text-[10px] font-semibold tracking-[.22em] text-[#999]">COMMAND</div>
          {['Overview', 'Autopilot', 'Tool Universe'].map((item) => <div key={item} className="mt-4 rounded-lg px-3 py-2 text-sm text-[#777]">✦ {item}</div>)}
          <div className="mt-8 text-[10px] font-semibold tracking-[.22em] text-[#999]">ACQUISITION</div>
          {['Lead Generation', 'Leads', 'Research', 'Campaigns'].map((item) => <div key={item} className={`mt-2 rounded-lg px-3 py-3 text-sm ${item === 'Leads' ? 'bg-[#eee9df] font-medium' : 'text-[#777]'}`}>◉ {item}</div>)}
          <div className="mt-8 text-[10px] font-semibold tracking-[.22em] text-[#999]">SALES</div>
          {['Outreach', 'WhatsApp', 'Email', 'Inbox', 'CRM', 'Follow-ups'].map((item) => <div key={item} className="mt-2 rounded-lg px-3 py-3 text-sm text-[#777]">◌ {item}</div>)}
          <div className="mt-8 rounded-2xl border border-[#d5eee4] bg-[#f2faf6] p-4"><div className="text-xs font-medium">● Systems operational</div><div className="mt-1 text-[10px] text-[#999]">RESEARCH · CRM · AI · OUTREACH</div></div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="flex items-center justify-between border-b border-[#e7e3da] bg-[#fbfaf7] px-6 py-4">
            <div className="hidden h-10 max-w-xl flex-1 items-center rounded-xl border border-[#e5e1d9] bg-white px-4 text-sm text-[#999] md:flex">⌕&nbsp;&nbsp; Search leads, campaigns, agents…</div>
            <div className="ml-auto flex items-center gap-4"><span className="rounded-full border border-[#bfe8d6] bg-[#f2faf6] px-4 py-2 text-[10px] font-semibold tracking-[.16em] text-[#1e9b68]">● SYSTEM ONLINE</span><span className="text-sm font-medium">Dev · Founder</span></div>
          </header>

          <div className="p-6 lg:p-10">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div><div className="text-4xl font-semibold tracking-[-.04em]">Lead Inbox</div><div className="mt-2 text-sm text-[#8d8a84]">Research, qualification and personalised WhatsApp outreach — automated.</div></div>
              <div className="flex gap-2">
                <label className="cursor-pointer rounded-xl border border-[#dcd7ce] bg-white px-4 py-3 text-sm font-medium shadow-sm">Import CSV<input className="hidden" type="file" accept=".csv,text/csv" onChange={importCsv} /></label>
                <button onClick={runAutopilot} disabled={running} className="rounded-xl bg-[#171717] px-5 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-50">{running ? 'Autopilot running…' : 'Run Autopilot'}</button>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {[['TOTAL LEADS', stats.total], ['QUALIFIED', stats.qualified], ['DRAFTS', stats.drafts], ['HIGH SCORE', stats.high], ['SENT', stats.sent]].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-[#e6e1d8] bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,.025)]"><div className="text-[10px] font-semibold tracking-[.18em] text-[#aaa]">{label}</div><div className="mt-3 text-3xl font-semibold">{value}</div></div>)}
            </div>

            <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_.9fr]">
              <div className="overflow-hidden rounded-2xl border border-[#e6e1d8] bg-white">
                <div className="flex items-center justify-between border-b border-[#eeeae3] px-6 py-5"><div><div className="font-semibold">Live Lead Pipeline</div><div className="text-xs text-[#aaa]">Research → qualify → personalise → WhatsApp</div></div><span className="rounded-full border border-[#d5eee4] px-3 py-1 text-[10px] text-[#1e9b68]">LIVE DATABASE</span></div>
                <div>{leads.map((lead) => <button key={lead.id} onClick={() => setSelected(lead.id)} className={`flex w-full items-center justify-between border-b border-[#f0ede7] px-6 py-5 text-left transition ${selected === lead.id ? 'bg-[#faf8f3]' : 'hover:bg-[#fcfbf9]'}`}><div className="min-w-0 pr-4"><div className="truncate font-medium">{lead.name}</div><div className="mt-1 text-xs text-[#999]">{lead.niche} · {lead.location ?? 'India'} · {lead.phone}</div></div><div className="flex shrink-0 items-center gap-5"><div className="text-right"><div className="text-[10px] text-[#aaa]">SCORE</div><div className="font-semibold">{lead.score ?? '—'}{lead.score ? '/100' : ''}</div></div><span className="rounded-full border border-[#e3dfd7] px-3 py-1 text-[9px] font-semibold tracking-[.12em]">{lead.status}</span></div></button>)}</div>
              </div>

              {current && <div className="rounded-2xl border border-[#e6e1d8] bg-white p-6">
                <div className="text-[10px] font-semibold tracking-[.18em] text-[#aaa]">LEAD INTELLIGENCE</div>
                <h2 className="mt-3 text-2xl font-semibold">{current.name}</h2>
                <div className="mt-2 text-sm text-[#777]">{current.phone} · {current.niche}</div>
                {current.website && <a className="mt-2 block truncate text-xs text-[#7b6a4a] underline" href={current.website} target="_blank">{current.website}</a>}
                <div className="mt-6 rounded-xl bg-[#f7f6f2] p-4 text-sm leading-6 text-[#555]">{current.finding ?? 'Not researched yet. Autopilot will research the website, identify the strongest pitch angle and generate a personalised message.'}</div>
                <div className="mt-5 flex flex-wrap gap-2 text-[10px] font-semibold tracking-[.12em]"><span className={`rounded-full px-3 py-2 ${current.whatsappVerified ? 'bg-[#edf9f3] text-[#1e9b68]' : 'bg-[#f4f1ec] text-[#888]'}`}>{current.whatsappVerified ? '✓ WHATSAPP VERIFIED' : 'WHATSAPP UNVERIFIED'}</span><span className="rounded-full bg-[#f4f1ec] px-3 py-2">{current.status}</span></div>
                <div className="mt-6 border-t border-[#eeeae3] pt-5"><div className="flex items-center justify-between"><div className="text-xs font-semibold">Personalised outreach</div><button onClick={() => researchLead(current)} className="text-xs font-semibold text-[#7b6a4a]">Research again</button></div><textarea readOnly value={current.message ?? ''} placeholder="Message will appear after research…" className="mt-3 min-h-56 w-full resize-none rounded-xl border border-[#e5e1d9] bg-[#fbfaf7] p-4 text-sm leading-6 outline-none" /><button onClick={sendCurrent} disabled={!current.whatsappVerified || !current.message || current.status === 'SENT'} className="mt-3 w-full rounded-xl bg-[#171717] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{current.status === 'SENT' ? 'WhatsApp sent' : 'Send WhatsApp'}</button></div>
              </div>}
            </div>

            <div className="mt-6 rounded-2xl border border-[#e6e1d8] bg-white p-5"><div className="text-xs font-semibold">Automation log</div><div className="mt-3 space-y-2 text-xs text-[#777]">{log.map((entry, i) => <div key={`${entry}-${i}`}>• {entry}</div>)}</div></div>
          </div>
        </section>
      </div>
    </main>
  );
}
