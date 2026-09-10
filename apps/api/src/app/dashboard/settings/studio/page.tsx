'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

type Setting = { key: string; label: string; description: string; type: 'toggle' | 'select' | 'text' | 'number'; options?: string[]; defaultValue: string | boolean | number };

const groups: Array<{ title: string; items: Setting[] }> = [
  { title: 'PROFILE & IDENTITY', items: [
    {key:'founder_name',label:'Founder display name',description:'Name shown across the executive workspace.',type:'text',defaultValue:'Dev'},
    {key:'workspace_name',label:'Workspace name',description:'Primary Nexor workspace label.',type:'text',defaultValue:'NexorAIOS'},
    {key:'founder_role',label:'Founder role',description:'Role shown under your identity.',type:'text',defaultValue:'Founder · Nexor'},
    {key:'avatar_url',label:'Founder photo URL',description:'Production-safe URL for your founder photo.',type:'text',defaultValue:'/founder-avatar.svg'},
    {key:'show_avatar',label:'Show founder photo',description:'Show your identity photo in command surfaces.',type:'toggle',defaultValue:true},
    {key:'compact_identity',label:'Compact identity',description:'Use compact founder identity in navigation.',type:'toggle',defaultValue:false},
  ]},
  { title: 'APPEARANCE', items: [
    {key:'theme',label:'Theme',description:'Choose the executive visual system.',type:'select',options:['Obsidian','Executive Pearl','Light','Gold Executive','System'],defaultValue:'Executive Pearl'},
    {key:'accent',label:'Accent color',description:'Primary interaction color.',type:'select',options:['Indigo','Violet','Cyan','Emerald','Gold','Monochrome'],defaultValue:'Indigo'},
    {key:'density',label:'Interface density',description:'Controls operational information density.',type:'select',options:['Comfortable','Compact','Dense','Terminal'],defaultValue:'Comfortable'},
    {key:'radius',label:'Corner style',description:'Controls surface rounding.',type:'select',options:['Sharp','Subtle','Rounded','Soft'],defaultValue:'Subtle'},
    {key:'font_scale',label:'Typography scale',description:'Global dashboard text scale.',type:'select',options:['Small','Default','Large','XL'],defaultValue:'Default'},
    {key:'animations',label:'Motion effects',description:'Enable subtle UI transitions.',type:'toggle',defaultValue:true},
    {key:'reduced_motion',label:'Reduced motion',description:'Respect reduced-motion accessibility preferences.',type:'toggle',defaultValue:false},
    {key:'glass',label:'Glass surfaces',description:'Enable restrained translucent navigation surfaces.',type:'toggle',defaultValue:true},
  ]},
  { title: 'TIME, LANGUAGE & GREETING', items: [
    {key:'timezone_mode',label:'Timezone source',description:'Use browser timezone, account timezone, or UTC.',type:'select',options:['Browser','Account','UTC'],defaultValue:'Browser'},
    {key:'account_timezone',label:'Account timezone',description:'Fallback timezone when browser timezone is unavailable.',type:'select',options:['Asia/Kolkata','Asia/Dubai','Europe/London','America/New_York','America/Los_Angeles','UTC'],defaultValue:'Asia/Kolkata'},
    {key:'language',label:'Interface language',description:'Dashboard language preference.',type:'select',options:['English','Hindi','Hinglish'],defaultValue:'English'},
    {key:'greeting',label:'Time-aware greeting',description:'Use Good morning / afternoon / evening from local time.',type:'toggle',defaultValue:true},
    {key:'greeting_morning_end',label:'Morning ends at',description:'Hour at which morning greeting changes.',type:'number',defaultValue:12},
    {key:'greeting_evening_start',label:'Evening starts at',description:'Hour at which evening greeting starts.',type:'number',defaultValue:18},
    {key:'clock_24h',label:'24-hour clock',description:'Use 24-hour timestamps across the OS.',type:'toggle',defaultValue:false},
    {key:'live_clock',label:'Live clock',description:'Show a continuously updated local clock.',type:'toggle',defaultValue:true},
  ]},
  { title: 'AUTOPILOT & AUTOMATION', items: [
    {key:'master_autopilot',label:'Master Autopilot',description:'Global autonomous operating loop.',type:'toggle',defaultValue:true},
    {key:'outbound_enabled',label:'Outbound communications',description:'Allow eligible outbound workers to execute.',type:'toggle',defaultValue:true},
    {key:'lead_discovery',label:'Automatic lead discovery',description:'Run scheduled lead discovery workers.',type:'toggle',defaultValue:true},
    {key:'research',label:'Automatic lead research',description:'Enrich and validate newly discovered leads.',type:'toggle',defaultValue:true},
    {key:'qualification',label:'Automatic qualification',description:'Score and qualify eligible leads.',type:'toggle',defaultValue:true},
    {key:'whatsapp_generation',label:'WhatsApp draft generation',description:'Generate personalized WhatsApp drafts.',type:'toggle',defaultValue:true},
    {key:'whatsapp_sending',label:'WhatsApp sending',description:'Allow eligible WhatsApp jobs to send.',type:'toggle',defaultValue:true},
    {key:'email_sending',label:'Email sending',description:'Allow eligible email jobs to send.',type:'toggle',defaultValue:true},
    {key:'social_publishing',label:'Social publishing',description:'Allow connected social workers to publish.',type:'toggle',defaultValue:true},
    {key:'followups',label:'Automatic follow-ups',description:'Create and process due follow-ups.',type:'toggle',defaultValue:true},
    {key:'daily_reports',label:'Daily reports',description:'Generate the owner morning report.',type:'toggle',defaultValue:true},
    {key:'growth_reports',label:'Growth reports',description:'Generate recurring growth summaries.',type:'toggle',defaultValue:true},
  ]},
  { title: 'OUTREACH POLICY', items: [
    {key:'approval_mode',label:'Approval policy',description:'Choose whether normal outbound requires approval.',type:'select',options:['Autonomous eligible','Always approve','Never send'],defaultValue:'Autonomous eligible'},
    {key:'quiet_hours',label:'Quiet hours',description:'Prevent commercial sends during local quiet hours.',type:'toggle',defaultValue:true},
    {key:'quiet_start',label:'Quiet hours start',description:'Local hour at which outbound quiet hours begin.',type:'number',defaultValue:21},
    {key:'quiet_end',label:'Quiet hours end',description:'Local hour at which outbound quiet hours end.',type:'number',defaultValue:9},
    {key:'daily_send_limit',label:'Daily outbound limit',description:'Maximum automated outbound attempts per day.',type:'number',defaultValue:100},
    {key:'followup_days',label:'Default follow-up delay',description:'Days before an unanswered follow-up.',type:'number',defaultValue:3},
    {key:'dedupe',label:'Duplicate-contact protection',description:'Prevent duplicate active outreach to the same lead.',type:'toggle',defaultValue:true},
    {key:'provider_confirm',label:'Provider-confirmed success',description:'Only mark SENT after provider confirmation.',type:'toggle',defaultValue:true},
  ]},
  { title: 'LEADS & CRM', items: [
    {key:'lead_score_threshold',label:'Qualification threshold',description:'Minimum score for qualified leads.',type:'number',defaultValue:70},
    {key:'auto_assign',label:'Auto-assign owner',description:'Assign leads to the default owner automatically.',type:'toggle',defaultValue:true},
    {key:'create_opportunity',label:'Auto-create opportunities',description:'Create opportunities for qualified high-intent leads.',type:'toggle',defaultValue:true},
    {key:'lead_enrichment',label:'Continuous enrichment',description:'Refresh stale lead intelligence.',type:'toggle',defaultValue:true},
    {key:'lead_source_required',label:'Require lead source',description:'Reject leads without a traceable source.',type:'toggle',defaultValue:true},
    {key:'activity_logging',label:'Activity timeline',description:'Record material lead state changes.',type:'toggle',defaultValue:true},
  ]},
  { title: 'SOCIAL MEDIA', items: [
    {key:'facebook',label:'Facebook publishing',description:'Enable connected Facebook publishing.',type:'toggle',defaultValue:true},
    {key:'instagram',label:'Instagram publishing',description:'Enable connected Instagram publishing.',type:'toggle',defaultValue:true},
    {key:'youtube',label:'YouTube publishing',description:'Enable connected YouTube publishing.',type:'toggle',defaultValue:true},
    {key:'linkedin',label:'LinkedIn publishing',description:'Enable when the LinkedIn integration is connected.',type:'toggle',defaultValue:false},
    {key:'x',label:'X publishing',description:'Enable when the X integration is connected.',type:'toggle',defaultValue:false},
    {key:'content_approval',label:'Content approval',description:'Require approval before scheduled publishing.',type:'toggle',defaultValue:true},
    {key:'platform_adaptation',label:'Platform-specific copy',description:'Generate native copy for each network.',type:'toggle',defaultValue:true},
  ]},
  { title: 'AI & AGENTS', items: [
    {key:'ai_autonomy',label:'AI autonomy level',description:'Controls how much work agents may execute automatically.',type:'select',options:['Conservative','Balanced','Autonomous','Maximum'],defaultValue:'Autonomous'},
    {key:'agent_retries',label:'Agent retry attempts',description:'Maximum transient retries for agent jobs.',type:'number',defaultValue:3},
    {key:'agent_trace',label:'Agent execution trace',description:'Record agent actions for observability.',type:'toggle',defaultValue:true},
    {key:'ai_reasoning_ui',label:'AI reasoning summaries',description:'Show concise rationale in the UI without exposing secrets.',type:'toggle',defaultValue:true},
    {key:'research_verification',label:'Research verification',description:'Require verified evidence before outreach personalization.',type:'toggle',defaultValue:true},
    {key:'memory_context',label:'Workspace context',description:'Use approved workspace context in agent tasks.',type:'toggle',defaultValue:true},
  ]},
  { title: 'REPORTING & OBSERVABILITY', items: [
    {key:'reporting',label:'Executive reporting',description:'Enable dashboard business reporting.',type:'toggle',defaultValue:true},
    {key:'report_email',label:'Email morning report',description:'Send the scheduled owner report.',type:'toggle',defaultValue:true},
    {key:'report_hour',label:'Morning report hour',description:'Local hour for the morning report.',type:'number',defaultValue:8},
    {key:'realtime_refresh',label:'Realtime dashboard refresh',description:'Refresh operational data without a page reload.',type:'toggle',defaultValue:true},
    {key:'refresh_seconds',label:'Refresh interval',description:'Seconds between lightweight dashboard refreshes.',type:'number',defaultValue:30},
    {key:'error_alerts',label:'Failure alerts',description:'Surface critical worker/provider failures immediately.',type:'toggle',defaultValue:true},
    {key:'audit_log',label:'Admin audit log',description:'Track configuration and administrative changes.',type:'toggle',defaultValue:true},
  ]},
  { title: 'DEVELOPER & SYSTEM', items: [
    {key:'api_logging',label:'API diagnostics',description:'Show safe API timing and status diagnostics.',type:'toggle',defaultValue:true},
    {key:'debug_mode',label:'Debug mode',description:'Enable additional non-secret diagnostics.',type:'toggle',defaultValue:false},
    {key:'strict_types',label:'Strict type enforcement',description:'Keep production TypeScript checks strict.',type:'toggle',defaultValue:true},
    {key:'maintenance_mode',label:'Maintenance mode',description:'Temporarily pause user-facing execution.',type:'toggle',defaultValue:false},
    {key:'cache_strategy',label:'Cache strategy',description:'Dashboard caching policy.',type:'select',options:['No-store','Balanced','Aggressive'],defaultValue:'No-store'},
    {key:'api_timeout',label:'API timeout (seconds)',description:'Client-side timeout for interactive actions.',type:'number',defaultValue:30},
    {key:'max_table_rows',label:'Maximum table rows',description:'Default operational table result size.',type:'number',defaultValue:200},
    {key:'safe_mode',label:'Production safe mode',description:'Prevent unsafe administrative shortcuts.',type:'toggle',defaultValue:true},
  ]},
];

const defaults = Object.fromEntries(groups.flatMap(g => g.items.map(i => [i.key, i.defaultValue])));

export default function SettingsStudio() {
  const [values, setValues] = useState<Record<string, string | boolean | number>>(defaults);
  const [query, setQuery] = useState('');
  const [saved, setSaved] = useState(false);
  const [clock, setClock] = useState('');
  const [tz, setTz] = useState('');

  useEffect(() => {
    try { const raw = localStorage.getItem('nexor-settings-v2'); if (raw) setValues({...defaults, ...JSON.parse(raw)}); } catch {}
    const update = () => { const d = new Date(); setClock(d.toLocaleString([], {weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'})); setTz(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'); };
    update(); const id = window.setInterval(update, 1000); return () => window.clearInterval(id);
  }, []);

  const filtered = useMemo(() => groups.map(g => ({...g, items: g.items.filter(i => !query || `${i.label} ${i.description} ${g.title}`.toLowerCase().includes(query.toLowerCase()))})).filter(g => g.items.length), [query]);
  const count = groups.reduce((n,g) => n + g.items.length, 0);
  const update = (key: string, value: string | boolean | number) => { setValues(v => ({...v, [key]: value})); setSaved(false); };
  const save = () => { localStorage.setItem('nexor-settings-v2', JSON.stringify(values)); setSaved(true); window.setTimeout(() => setSaved(false), 1800); };
  const reset = () => { setValues(defaults); localStorage.setItem('nexor-settings-v2', JSON.stringify(defaults)); setSaved(true); };

  return <DashboardLayout><main className="min-h-full space-y-5 pb-10">
    <section className="nexor-panel overflow-hidden">
      <div className="flex flex-col gap-5 border-b border-[var(--border)] p-5 md:p-7 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]"><img src={String(values.avatar_url || '/founder-avatar.svg')} alt="Founder" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display='none'; }} /></div>
          <div><div className="font-mono text-[8px] tracking-[.22em] text-[var(--accent)]">NEXORAIOS · ADMIN CONTROL PLANE</div><h1 className="mt-1 text-3xl font-semibold tracking-[-.04em]">Settings Studio</h1><p className="mt-1 text-[10px] text-[var(--text-secondary)]">Maximum owner-level control over appearance, automation, AI, outreach, social, reporting and developer behavior.</p></div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[8px] font-mono"><span className="rounded-full border border-[var(--success)]/25 bg-[var(--success)]/10 px-3 py-2 text-[var(--success)]">● LIVE</span><span className="rounded-full border border-[var(--border)] px-3 py-2 text-[var(--text-muted)]">{count} CONTROLS</span><span className="rounded-full border border-[var(--border)] px-3 py-2 text-[var(--text-muted)]">{tz || 'Detecting timezone…'}</span></div>
      </div>
      <div className="grid gap-3 p-5 md:grid-cols-[1fr_auto] md:p-6"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search settings…" className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 text-[11px] outline-none focus:border-[var(--primary)]" /><div className="flex gap-2"><button onClick={save} className="rounded-xl bg-[var(--primary)] px-5 py-2.5 text-[10px] font-bold text-white">{saved ? 'SAVED ✓' : 'SAVE CHANGES'}</button><button onClick={reset} className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-[10px] text-[var(--text-secondary)]">RESET</button></div></div>
    </section>

    <section className="grid gap-4 lg:grid-cols-[240px_1fr]">
      <aside className="nexor-panel h-fit p-3 lg:sticky lg:top-4"><div className="px-3 py-2 font-mono text-[7px] tracking-[.18em] text-[var(--text-muted)]">CONTROL INDEX</div>{groups.map(g=><a key={g.title} href={`#${g.title.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}`} className="block rounded-lg px-3 py-2 text-[9px] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]">{g.title}<span className="float-right font-mono text-[7px] text-[var(--text-muted)]">{g.items.length}</span></a>)}</aside>
      <div className="space-y-4">{filtered.map(group=><section key={group.title} id={group.title.replace(/[^a-z0-9]+/gi,'-').toLowerCase()} className="nexor-panel overflow-hidden"><div className="border-b border-[var(--border)] px-5 py-4"><div className="font-mono text-[7px] tracking-[.18em] text-[var(--accent)]">{group.title}</div><div className="mt-1 text-[13px] font-semibold">{group.items.length} controls</div></div><div className="divide-y divide-[var(--border)]">{group.items.map(item=><div key={item.key} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between"><div className="min-w-0 md:max-w-[62%]"><div className="text-[10px] font-semibold">{item.label}</div><div className="mt-1 text-[8px] leading-4 text-[var(--text-muted)]">{item.description}</div></div><div className="w-full md:w-auto">{item.type==='toggle' ? <button onClick={()=>update(item.key,!Boolean(values[item.key]))} className={['relative h-7 w-12 rounded-full transition',Boolean(values[item.key])?'bg-[var(--primary)]':'bg-[var(--surface-3)]'].join(' ')}><span className={['absolute top-1 h-5 w-5 rounded-full bg-white transition',Boolean(values[item.key])?'left-6':'left-1'].join(' ')} /></button> : item.type==='select' ? <select value={String(values[item.key])} onChange={e=>update(item.key,e.target.value)} className="h-9 min-w-[170px] rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 text-[9px] outline-none">{item.options?.map(o=><option key={o}>{o}</option>)}</select> : <input type={item.type==='number'?'number':'text'} value={String(values[item.key] ?? '')} onChange={e=>update(item.key,item.type==='number'?Number(e.target.value):e.target.value)} className="h-9 w-full min-w-[170px] rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 text-[9px] outline-none md:w-[210px]" />}</div></div>)}</div></section>)}</div>
    </section>

    <section className="nexor-panel grid gap-4 p-5 md:grid-cols-3"><div><div className="font-mono text-[7px] text-[var(--text-muted)]">LOCAL CLOCK</div><div className="mt-1 text-xl font-semibold">{clock || '—'}</div></div><div><div className="font-mono text-[7px] text-[var(--text-muted)]">TIMEZONE</div><div className="mt-1 text-[11px] font-semibold">{tz || '—'}</div></div><div><div className="font-mono text-[7px] text-[var(--text-muted)]">AUTOMATION</div><div className="mt-1 text-[11px] font-semibold">{values.master_autopilot ? 'AUTOPILOT ENABLED' : 'PAUSED'}</div><Link href="/dashboard/settings/automation" className="mt-2 inline-block text-[8px] text-[var(--accent)]">Open automation control →</Link></div></section>
  </main></DashboardLayout>;
}
