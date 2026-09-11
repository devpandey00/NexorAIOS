'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect,useRef,useState } from 'react';

const groups=[
 {title:'COMMAND',items:[['Overview','/dashboard','⌂'],['Command Center','/dashboard/aios','✦'],['Autopilot HQ','/dashboard/autopilot','◈']]},
 {title:'ACQUISITION',items:[['Lead Generation','/dashboard/tools/lead-finder','◎'],['Lead Intelligence','/dashboard/tools/lead-inbox','◉'],['Research','/dashboard/tools/seo-audit','⌕'],['Campaigns','/dashboard/command','◌'],['Opportunities','/dashboard/tools/opportunities','◇']]},
 {title:'SALES',items:[['Outreach','/dashboard/tools/whatsapp-drafts','↗'],['WhatsApp','/dashboard/tools/whatsapp-automation','◍'],['Email','/dashboard/tools/email-drafts','✉'],['Inbox','/dashboard/tools/whatsapp-inbox','□'],['CRM Pipeline','/dashboard/tools/crm-pipeline','◫'],['Follow-ups','/dashboard/tools/follow-up-manager','↻'],['Proposals','/dashboard/aios#proposals','▤']]},
 {title:'GROWTH',items:[['Social OS','/dashboard/tools/social-growth','✦'],['Social Hub','/dashboard/tools/social-scheduler','◎'],['Content Calendar','/dashboard/tools/content-calendar','◫'],['Content Studio','/dashboard/tools/content-ideas','✎'],['Meta Ads','/dashboard/tools/meta-ads-overview','M'],['SEO','/dashboard/tools/seo-audit','⌕']]},
 {title:'OPERATIONS',items:[['AI Agents','/dashboard/tools/ai-agents','✧'],['Automations','/dashboard/tools/automation-center','⚙'],['Automation Control','/dashboard/settings/automation','◉'],['Approvals','/dashboard/aios#approvals','✓'],['Clients','/dashboard/aios#clients','◉'],['Finance','/dashboard/aios#finance','₹'],['Reports','/dashboard/tools/google-reporting','▤'],['Settings Studio','/dashboard/settings/studio','⚙']]},
];

export default function Sidebar(){
 const pathname=usePathname();const scrollRef=useRef<HTMLDivElement>(null);const[avatar,setAvatar]=useState('/founder-avatar.svg');const[founder,setFounder]=useState('Dev');
 useEffect(()=>{const n=scrollRef.current;if(!n)return;n.scrollTop=Number(sessionStorage.getItem('nexor-sidebar-scroll')||0);const save=()=>sessionStorage.setItem('nexor-sidebar-scroll',String(n.scrollTop));n.addEventListener('scroll',save,{passive:true});return()=>n.removeEventListener('scroll',save)},[]);
 useEffect(()=>{const read=()=>{try{const v=JSON.parse(localStorage.getItem('nexor-settings-v2')||localStorage.getItem('nexor-settings-v3')||'{}');if(v.avatar_url)setAvatar(String(v.avatar_url));if(v.founder_name)setFounder(String(v.founder_name))}catch{}};read();window.addEventListener('storage',read);window.addEventListener('nexor-settings-updated',read);return()=>{window.removeEventListener('storage',read);window.removeEventListener('nexor-settings-updated',read)}},[]);
 return <aside className="sticky top-0 hidden h-screen w-[256px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] lg:flex">
  <div className="flex h-[68px] items-center border-b border-[var(--border)] px-5">
   <div className="flex items-center gap-3"><div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-[9px] border border-[var(--accent)]/30 bg-[var(--text)] text-sm font-black text-[var(--accent)]">N<span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-[var(--primary)]"/></div><div><div className="text-[13px] font-extrabold tracking-[.22em]">NEXOR</div><div className="mt-0.5 font-mono text-[7px] tracking-[.17em] text-[var(--text-muted)]">BUSINESS OPERATING SYSTEM</div></div></div>
  </div>
  <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4">
   {groups.map(g=><div key={g.title} className="mb-5"><div className="mb-2 px-3 font-mono text-[7px] font-bold tracking-[.19em] text-[var(--text-muted)]">{g.title}</div><div className="space-y-0.5">{g.items.map(([label,href,icon])=>{const active=pathname===href||(href!=='/dashboard'&&pathname.startsWith(href));return <Link key={`${label}-${href}`} href={href} className={['group flex h-8 items-center gap-3 rounded-[7px] border px-3 text-[10px] transition-all',active?'border-[var(--primary)]/15 bg-[var(--primary-soft)] font-semibold text-[var(--text)]':'border-transparent text-[var(--text-secondary)] hover:border-[var(--border)] hover:bg-[var(--surface-2)]'].join(' ')}><span className={active?'w-4 text-center text-[var(--primary)]':'w-4 text-center text-[var(--text-muted)]'}>{icon}</span><span className="flex-1 truncate">{label}</span>{active&&<span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]"/>}</Link>})}</div></div>)}
  </div>
  <div className="border-t border-[var(--border)] p-3">
   <Link href="/dashboard/settings/studio" className="mb-2 flex items-center gap-2 rounded-[8px] border border-[var(--accent)]/15 bg-[var(--accent-soft)] px-3 py-2.5"><span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]"/><div><div className="text-[8px] font-semibold">Founder Control Plane</div><div className="mt-0.5 font-mono text-[6px] text-[var(--text-muted)]">APPEARANCE · AUTOMATION · IDENTITY</div></div></Link>
   <div className="mb-2 flex items-center gap-2 rounded-[8px] border border-[var(--success)]/15 bg-[var(--success)]/[.035] px-3 py-2"><span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]"/><div><div className="text-[8px] font-semibold">Operating normally</div><div className="mt-0.5 font-mono text-[6px] text-[var(--text-muted)]">CORE · DATABASE · WORKERS</div></div></div>
   <Link href="/dashboard/settings/studio" className="flex items-center gap-3 rounded-[8px] px-2 py-2 hover:bg-[var(--surface-2)]"><img src={avatar} alt="Founder" className="h-8 w-8 rounded-full border border-[var(--primary)]/20 object-cover" onError={e=>{e.currentTarget.src='/founder-avatar.svg'}}/><div><div className="text-[9px] font-semibold">{founder}</div><div className="text-[7px] text-[var(--text-muted)]">Founder · Nexor Media</div></div><span className="ml-auto text-[var(--text-muted)]">›</span></Link>
  </div>
 </aside>
}
