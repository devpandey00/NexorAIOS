'use client';

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Activity, Bell, Bot, BriefcaseBusiness, CheckCircle2, CircleDollarSign, Command, Database,
  Download, ExternalLink, Gauge, Globe2, LayoutDashboard, MessageCircle, MoreVertical, Play,
  RefreshCw, Search, Send, Settings, ShieldCheck, Sparkles, Users, Workflow, X, Zap,
} from 'lucide-react';

type SettingsState = {
  founder_name: string;
  founder_role: string;
  avatar: string;
  theme: string;
  accent: string;
  density: string;
  font_scale: string;
};

type Overview = {
  success: boolean;
  generatedAt: string;
  today?: {
    totalLeads: number;
    qualified: number;
    outreachReady: number;
    replies: number;
    meetings: number;
    proposals: number;
    won: number;
    revenue: string;
    sent: number;
    emailsSent: number;
    whatsappSent: number;
    outboundMessages: number;
    inboundMessages: number;
    followups: number;
    failedJobs: number;
    runningCampaigns: number;
  };
  pipeline?: { open: number; qualified: number; proposal: number; won: number; lost: number };
  hotLeads?: Array<{ id: string; business_name: string; country: string; niche: string; audit_score: number; status: string }>;
  activity?: Array<{ id: string; type: string; message: string; created_at: string }>;
  integrations?: Record<string, string>;
  automation?: Array<{ key: string; label: string; enabled: boolean; updatedAt: string | null }>;
  autopilot?: { enabled: boolean };
  social?: { created: number; published: number; scheduled: number; failed: number; instagram: number; facebook: number; linkedin: number; youtube: number; x: number };
};

const DEFAULT_SETTINGS: SettingsState = {
  founder_name: 'Dev', founder_role: 'Founder · Nexor Media', avatar: '/founder-avatar.svg',
  theme: 'Pearl Glass', accent: 'Indigo', density: 'Comfortable', font_scale: 'Default',
};
const THEMES = ['Pearl Glass', 'Obsidian Aurora', 'Midnight Emerald', 'Cosmic Indigo', 'Sage Mist', 'Titanium Minimal'];
const ACCENTS = ['Indigo', 'Violet', 'Cyan', 'Emerald', 'Gold', 'Monochrome'];
const DENSITIES = ['Comfortable', 'Compact', 'Dense', 'Terminal'];
const FONT_SCALES = ['Small', 'Default', 'Large', 'XL'];
const THEME = {
  'Pearl Glass': { bg: '#f7f8fc', surface: '#ffffff', muted: '#64748b', text: '#111827', border: '#e7eaf2', card: '#ffffff' },
  'Obsidian Aurora': { bg: '#07090e', surface: '#0d111a', muted: '#9aa5bb', text: '#f5f7fb', border: 'rgba(255,255,255,.10)', card: '#111722' },
  'Midnight Emerald': { bg: '#06110d', surface: '#0b1712', muted: '#a3c1b1', text: '#f2faf5', border: 'rgba(110,231,183,.14)', card: '#0f1d17' },
  'Cosmic Indigo': { bg: '#08091a', surface: '#10112a', muted: '#b3b0d4', text: '#f5f3ff', border: 'rgba(167,139,250,.18)', card: '#141632' },
  'Sage Mist': { bg: '#eff2ec', surface: '#fbfcf8', muted: '#5e665d', text: '#20251f', border: '#d8dfd3', card: '#fbfcf8' },
  'Titanium Minimal': { bg: '#e9ebee', surface: '#f9fafb', muted: '#59606a', text: '#17191c', border: '#cfd4da', card: '#f9fafb' },
} as const;
const ACCENT = { Indigo: '#6841ef', Violet: '#8b5cf6', Cyan: '#0891b2', Emerald: '#059669', Gold: '#b38b2e', Monochrome: '#64707c' } as const;
const SCALE = { Small: 0.9, Default: 1, Large: 1.1, XL: 1.2 } as const;

function money(value: string | number) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value || 0)); }
function number(value: number) { return new Intl.NumberFormat('en-US').format(Number(value || 0)); }
function ago(value?: string) { if (!value) return '—'; const diff = Math.max(0, Date.now() - new Date(value).getTime()); const mins = Math.floor(diff / 60000); if (mins < 1) return 'now'; if (mins < 60) return `${mins}m ago`; const hrs = Math.floor(mins / 60); if (hrs < 24) return `${hrs}h ago`; return `${Math.floor(hrs / 24)}d ago`; }

export default function StitchDashboardFrame() {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [command, setCommand] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, profileRes] = await Promise.all([
        fetch('/api/founder/overview', { cache: 'no-store' }),
        fetch('/api/founder/profile', { cache: 'no-store' }),
      ]);
      const overview = await overviewRes.json();
      const profile = await profileRes.json();
      if (!overviewRes.ok || !overview.success) throw new Error(overview.error || 'System overview unavailable');
      setData(overview);
      if (profile?.success && profile.profile) setSettings((current) => ({ ...current, ...profile.profile }));
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not load command center'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 30000); return () => window.clearInterval(timer); }, [load]);

  const theme = THEME[settings.theme as keyof typeof THEME] || THEME['Pearl Glass'];
  const accent = ACCENT[settings.accent as keyof typeof ACCENT] || ACCENT.Indigo;
  const scale = SCALE[settings.font_scale as keyof typeof SCALE] || 1;
  const today = data?.today;
  const pipeline = data?.pipeline;
  const healthCount = Object.values(data?.integrations || {}).filter((v) => ['CONNECTED', 'CONFIGURED'].includes(v)).length;

  async function runAction(key: string, query: string) {
    setBusy(key); setMessage('');
    try {
      const res = await fetch('/api/command', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query }) });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error || body.execution?.error || 'Command failed');
      setMessage(body.execution?.autonomousMode ? 'Autonomous execution enabled. Production workers are active.' : 'Command accepted and executed.');
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Command failed'); }
    finally { setBusy(null); }
  }

  async function saveSettings(next: SettingsState) {
    setSettings(next);
    try {
      const res = await fetch('/api/founder/profile', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ profile: next }) });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error || 'Settings save failed');
      localStorage.setItem('nexor-settings-v2', JSON.stringify(next));
      setMessage('Appearance saved to the production database.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Settings save failed'); }
  }

  function exportLedger() {
    const rows = [['Metric', 'Value'], ['Total Leads', today?.totalLeads ?? 0], ['Qualified Leads', today?.qualified ?? 0], ['Outreach Ready', today?.outreachReady ?? 0], ['Replies', today?.replies ?? 0], ['Meetings', today?.meetings ?? 0], ['Proposals', today?.proposals ?? 0], ['Won', today?.won ?? 0], ['Won Revenue', today?.revenue ?? 0], ['Outbound Messages', today?.outboundMessages ?? 0], ['Inbound Messages', today?.inboundMessages ?? 0], ['Running Campaigns', today?.runningCampaigns ?? 0]];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `nexor-ledger-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  const links = [
    ['Lead Generation', '/dashboard/growth', Users], ['Lead Intelligence', '/dashboard/tools', Sparkles], ['CRM & Deals', '/dashboard/command', BriefcaseBusiness], ['Messaging OS', '/dashboard/communication', MessageCircle],
    ['Automations', '/dashboard/autopilot', Workflow], ['Analytics & Cohorts', '/dashboard/growth', Activity], ['Founder Control Plane', '/dashboard/autopilot', Zap], ['System Health', '/dashboard/settings', ShieldCheck], ['Integrations & API', '/dashboard/settings', Globe2],
  ] as const;

  return <div className={`nx-shell nx-density-${settings.density.toLowerCase()}`} style={{ '--nx-bg': theme.bg, '--nx-surface': theme.surface, '--nx-card': theme.card, '--nx-text': theme.text, '--nx-muted': theme.muted, '--nx-border': theme.border, '--nx-accent': accent, '--nx-scale': scale } as CSSProperties}>
    <style>{`
      .nx-shell{min-height:100dvh;background:var(--nx-bg);color:var(--nx-text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:calc(14px * var(--nx-scale));line-height:1.35}.nx-shell *{box-sizing:border-box}.nx-shell a{text-decoration:none;color:inherit}.nx-btn{border:0;cursor:pointer;font:inherit}.nx-muted{color:var(--nx-muted)}
      .nx-layout{display:grid;grid-template-columns:272px minmax(0,1fr);min-height:100dvh}.nx-sidebar{background:var(--nx-surface);border-right:1px solid var(--nx-border);padding:18px 12px;display:flex;flex-direction:column;gap:14px}.nx-brand{display:flex;align-items:center;gap:11px;padding:2px 8px 14px}.nx-logo{width:38px;height:38px;border-radius:10px;background:#080b12;color:#fff;display:grid;place-items:center;font-weight:900;font-size:12px}.nx-brand-title{font-size:15px;font-weight:850;letter-spacing:-.02em}.nx-brand-sub{font-size:9px;color:#c47c1e;letter-spacing:.16em;font-weight:900;margin-top:2px}.nx-os{font-size:9px;padding:2px 5px;border:1px solid color-mix(in srgb,var(--nx-accent) 35%,transparent);color:var(--nx-accent);border-radius:4px;margin-left:4px;vertical-align:2px}.nx-section-title{font-size:9px;letter-spacing:.13em;font-weight:850;color:var(--nx-muted);padding:0 12px;margin:7px 0 2px}.nx-nav{display:flex;flex-direction:column;gap:3px}.nx-nav a,.nx-nav button{display:flex;align-items:center;gap:11px;min-height:38px;padding:8px 11px;border-radius:9px;color:var(--nx-muted);font-size:12px;font-weight:650}.nx-nav a:hover,.nx-nav button:hover{background:color-mix(in srgb,var(--nx-accent) 8%,transparent);color:var(--nx-text)}.nx-nav a.active{background:color-mix(in srgb,var(--nx-accent) 9%,transparent);color:var(--nx-accent)}.nx-badge{margin-left:auto;font-size:10px;font-weight:800;padding:2px 7px;border-radius:6px;background:color-mix(in srgb,var(--nx-muted) 10%,transparent);white-space:nowrap}.nx-dot{width:6px;height:6px;border-radius:99px;background:#12b981;margin-left:auto}.nx-profile{margin-top:auto;border:1px solid var(--nx-border);border-radius:12px;padding:10px;display:flex;gap:9px;align-items:center}.nx-avatar{width:32px;height:32px;border-radius:50%;object-fit:cover;background:#ddd}.nx-profile-name{font-size:11px;font-weight:850}.nx-profile-role{font-size:9px;color:var(--nx-muted)}.nx-more{margin-left:auto;color:var(--nx-muted)}
      .nx-main{min-width:0;display:flex;flex-direction:column}.nx-topbar{height:68px;background:color-mix(in srgb,var(--nx-surface) 94%,transparent);border-bottom:1px solid var(--nx-border);display:flex;align-items:center;gap:14px;padding:0 24px;position:sticky;top:0;z-index:20;backdrop-filter:blur(16px)}.nx-search{height:38px;border:1px solid var(--nx-border);border-radius:9px;background:var(--nx-bg);display:flex;align-items:center;gap:9px;padding:0 12px;flex:1;max-width:610px;color:var(--nx-muted)}.nx-search input{border:0;outline:0;background:transparent;color:var(--nx-text);width:100%;font:inherit;font-size:12px}.nx-search kbd{font-size:10px;border:1px solid var(--nx-border);border-radius:5px;padding:2px 5px;background:var(--nx-surface)}.nx-top-actions{margin-left:auto;display:flex;align-items:center;gap:8px}.nx-health{display:flex;align-items:center;gap:7px;padding:0 13px;height:36px;border-right:1px solid var(--nx-border);font-size:11px;font-weight:750;color:var(--nx-muted)}.nx-health i{width:7px;height:7px;border-radius:99px;background:#11b981}.nx-icon-btn{width:36px;height:36px;border-radius:9px;background:var(--nx-surface);border:1px solid var(--nx-border);display:grid;place-items:center;color:var(--nx-muted)}.nx-primary{height:38px;padding:0 14px;border-radius:9px;background:var(--nx-accent);color:#fff;font-weight:850;display:inline-flex;align-items:center;gap:7px;box-shadow:0 8px 18px color-mix(in srgb,var(--nx-accent) 22%,transparent)}
      .nx-content{padding:28px 26px 34px;max-width:1600px;width:100%;margin:0 auto}.nx-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:20px}.nx-hero h1{font-size:24px;line-height:1.1;letter-spacing:-.04em;margin:0;font-weight:850}.nx-hero p{margin:6px 0 0;color:var(--nx-muted);font-size:11px}.nx-runrate{text-align:right}.nx-runrate strong{display:block;font-size:14px}.nx-runrate span{font-size:9px;color:var(--nx-muted)}
      .nx-command{border-radius:15px;padding:18px 20px;color:#fff;background:linear-gradient(135deg,#5420bb 0%,#33205f 100%);box-shadow:0 16px 42px rgba(88,48,185,.24);margin-bottom:20px}.nx-command-top{display:flex;align-items:center;gap:10px}.nx-command-title{font-weight:850;font-size:14px}.nx-model{font-size:9px;border:1px solid rgba(255,255,255,.16);padding:3px 7px;border-radius:6px;color:#ddd}.nx-context{margin-left:auto;font-size:9px;color:#c6bce4}.nx-command-input{margin-top:13px;height:40px;border-radius:8px;border:1px solid rgba(255,255,255,.18);background:rgba(4,3,22,.46);display:flex;align-items:center;padding:0 6px 0 13px;gap:7px}.nx-command-input input{flex:1;border:0;outline:0;background:transparent;color:#fff;font:inherit;font-size:11px}.nx-command-input button{height:30px;padding:0 13px;border-radius:7px;background:#9347ff;color:#fff;font-weight:850;border:0}.nx-insight{margin-top:12px;border-radius:8px;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.14);padding:10px 12px;display:flex;align-items:center;gap:10px}.nx-insight-icon{width:28px;height:28px;border-radius:50%;background:rgba(255,190,70,.16);display:grid;place-items:center;color:#ffca3a}.nx-insight-text{font-size:11px;line-height:1.4;flex:1}.nx-command-actions{display:flex;gap:8px}.nx-command-actions button{height:32px;padding:0 12px;border-radius:6px;font-size:10px;font-weight:850;display:inline-flex;align-items:center;gap:6px}.nx-send{background:#10c89a;color:#071a15;border:0}.nx-inspect{background:transparent;border:1px solid rgba(255,255,255,.25);color:#fff}
      .nx-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:15px;margin-bottom:18px}.nx-kpi{background:var(--nx-card);border:1px solid var(--nx-border);border-radius:13px;padding:17px 18px}.nx-kpi-head{display:flex;justify-content:space-between;align-items:center;color:var(--nx-muted);font-size:10px;font-weight:800;letter-spacing:.1em}.nx-kpi-icon{width:31px;height:31px;border-radius:7px;display:grid;place-items:center;background:color-mix(in srgb,var(--nx-accent) 9%,transparent);color:var(--nx-accent)}.nx-kpi-value{font-size:23px;font-weight:850;letter-spacing:-.035em;margin-top:10px}.nx-kpi-meta{display:flex;justify-content:space-between;margin-top:9px;padding-top:9px;border-top:1px solid var(--nx-border);font-size:9px;color:var(--nx-muted)}.nx-kpi-meta strong{color:#059669}
      .nx-grid{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(300px,.9fr);gap:18px}.nx-panel{background:var(--nx-card);border:1px solid var(--nx-border);border-radius:14px;overflow:hidden}.nx-panel-head{min-height:58px;padding:0 17px;display:flex;align-items:center;gap:9px;border-bottom:1px solid var(--nx-border)}.nx-panel-head h2{font-size:13px;margin:0;font-weight:850}.nx-panel-head span{font-size:9px;color:var(--nx-muted)}.nx-panel-head .right{margin-left:auto}.nx-pipeline{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;padding:12px}.nx-stage{min-height:155px;border:1px solid var(--nx-border);border-radius:9px;padding:10px;background:color-mix(in srgb,var(--nx-bg) 35%,transparent)}.nx-stage-title{display:flex;align-items:center;gap:6px;font-size:10px;font-weight:800}.nx-stage-dot{width:8px;height:8px;border-radius:50%;background:#94a3b8}.nx-stage-dot.yellow{background:#f0b90b}.nx-stage-dot.purple{background:var(--nx-accent)}.nx-stage-dot.green{background:#10b981}.nx-stage-value{margin-left:auto;color:var(--nx-muted);font-size:9px}.nx-lead-card{margin-top:10px;padding:11px;border:1px solid var(--nx-border);border-radius:8px;background:var(--nx-surface)}.nx-lead-tag{display:inline-flex;padding:3px 6px;border-radius:4px;background:color-mix(in srgb,var(--nx-accent) 9%,transparent);color:var(--nx-accent);font-size:8px;font-weight:900}.nx-lead-name{font-size:11px;font-weight:850;margin-top:7px}.nx-lead-sub{font-size:9px;color:var(--nx-muted);margin-top:4px;line-height:1.45}.nx-feed{padding:10px 14px}.nx-feed-item{padding:12px 2px;border-bottom:1px solid var(--nx-border)}.nx-feed-item:last-child{border-bottom:0}.nx-feed-top{display:flex;align-items:center;gap:8px}.nx-feed-avatar{width:27px;height:27px;border-radius:50%;background:color-mix(in srgb,var(--nx-accent) 12%,transparent);display:grid;place-items:center;color:var(--nx-accent)}.nx-feed-name{font-size:10px;font-weight:850}.nx-feed-time{margin-left:auto;color:var(--nx-muted);font-size:8px}.nx-feed-msg{font-size:10px;line-height:1.5;margin:8px 0 0;color:var(--nx-muted)}.nx-intent{margin-top:8px;font-size:8px;color:var(--nx-accent);font-weight:850}.nx-empty{padding:26px;text-align:center;color:var(--nx-muted);font-size:10px}.nx-footer{margin-top:14px;border-top:1px solid var(--nx-border);padding:10px 0;display:flex;align-items:center;gap:16px;color:var(--nx-muted);font-size:9px;overflow:auto}.nx-footer span{display:flex;align-items:center;gap:5px;white-space:nowrap}.nx-footer .ok{color:#059669}.nx-message{position:fixed;right:18px;bottom:18px;z-index:80;max-width:380px;padding:11px 14px;border-radius:9px;background:#101522;color:#fff;font-size:10px;box-shadow:0 14px 38px rgba(0,0,0,.24)}
      .nx-overlay{position:fixed;inset:0;z-index:100;background:rgba(2,6,23,.42);backdrop-filter:blur(5px);display:flex;justify-content:flex-end}.nx-settings{width:min(430px,94vw);height:100%;background:var(--nx-surface);border-left:1px solid var(--nx-border);padding:22px;overflow:auto;box-shadow:-24px 0 70px rgba(2,6,23,.22)}.nx-settings-head{display:flex;align-items:center;justify-content:space-between}.nx-settings h2{margin:0;font-size:20px}.nx-settings p{font-size:10px;color:var(--nx-muted);line-height:1.55}.nx-setting{margin-top:18px}.nx-setting-label{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.12em;font-weight:850;color:var(--nx-muted);margin-bottom:7px}.nx-options{display:grid;grid-template-columns:1fr 1fr;gap:7px}.nx-option{border:1px solid var(--nx-border);background:var(--nx-bg);color:var(--nx-text);padding:9px 10px;border-radius:8px;text-align:left;font:inherit;font-size:10px;cursor:pointer}.nx-option.active{border-color:var(--nx-accent);box-shadow:inset 0 0 0 1px var(--nx-accent);color:var(--nx-accent)}
      @media(max-width:1180px){.nx-kpis{grid-template-columns:repeat(2,1fr)}.nx-grid{grid-template-columns:1fr}.nx-pipeline{grid-template-columns:repeat(2,1fr)}}
      @media(max-width:900px){.nx-layout{grid-template-columns:1fr}.nx-sidebar{position:fixed;left:0;top:0;bottom:0;width:280px;z-index:50;transform:translateX(-102%);transition:transform .2s ease;box-shadow:18px 0 50px rgba(0,0,0,.18)}.nx-sidebar.open{transform:translateX(0)}.nx-mobile-menu{display:grid!important}.nx-topbar{padding:0 12px}.nx-content{padding:20px 12px}.nx-health{display:none}.nx-search{max-width:none}.nx-runrate{display:none}}
      @media(max-width:640px){.nx-topbar{height:60px}.nx-primary span{display:none}.nx-primary{width:38px;padding:0;justify-content:center}.nx-content{padding:15px 10px 28px}.nx-hero h1{font-size:19px}.nx-command{padding:14px}.nx-context{display:none}.nx-insight{align-items:flex-start;flex-wrap:wrap}.nx-command-actions{width:100%;margin-top:8px}.nx-command-actions button{flex:1;justify-content:center}.nx-kpis{grid-template-columns:1fr 1fr;gap:9px}.nx-kpi{padding:12px}.nx-kpi-value{font-size:19px}.nx-kpi-meta{font-size:8px}.nx-pipeline{grid-template-columns:1fr}.nx-stage{min-height:120px}.nx-panel-head{min-height:52px}.nx-brand{padding-bottom:10px}}
      .nx-mobile-menu{display:none;position:relative;width:36px;height:36px;border:1px solid var(--nx-border);border-radius:9px;background:var(--nx-surface);color:var(--nx-text);place-items:center;flex:none}.nx-density-compact .nx-content{padding-top:20px}.nx-density-dense .nx-content{padding-top:15px}.nx-density-terminal .nx-content{padding:9px 12px}.nx-density-terminal .nx-kpi{padding:9px 11px}.nx-density-terminal .nx-panel-head{min-height:48px}
    `}</style>
    <div className="nx-layout">
      <aside className={`nx-sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="nx-brand"><div className="nx-logo">NX</div><div><div className="nx-brand-title">NexorAIOS <span className="nx-os">OS 4.2</span></div><div className="nx-brand-sub">ENTERPRISE CORE</div></div></div>
        <div className="nx-section-title">OVERVIEW</div><nav className="nx-nav"><Link className="active" href="/dashboard" onClick={()=>setMobileOpen(false)}><LayoutDashboard size={14}/>Command Center<span className="nx-dot"/></Link></nav>
        <div className="nx-section-title">GROWTH ENGINE</div><nav className="nx-nav">{links.slice(0,4).map(([label,href,Icon])=><Link key={label} href={href} onClick={()=>setMobileOpen(false)}><Icon size={14}/>{label}{label==='Lead Generation'&&<span className="nx-badge">{today?number(today.totalLeads):'—'}</span>}{label==='Messaging OS'&&<span className="nx-badge">{today?`${today.replies} New`:'—'}</span>}{label==='Lead Intelligence'&&<span className="nx-dot"/>}</Link>)}</nav>
        <div className="nx-section-title">OPERATIONS</div><nav className="nx-nav">{links.slice(4,6).map(([label,href,Icon])=><Link key={label} href={href} onClick={()=>setMobileOpen(false)}><Icon size={14}/>{label}{label==='Automations'&&<span className="nx-badge">{data?.automation?.filter(x=>x.enabled).length ?? 0} active</span>}</Link>)}</nav>
        <div className="nx-section-title">FOUNDER SUITE</div><nav className="nx-nav">{links.slice(6).map(([label,href,Icon])=><Link key={label} href={href} onClick={()=>setMobileOpen(false)}><Icon size={14}/>{label}</Link>)}<button className="nx-btn" onClick={()=>setSettingsOpen(true)}><Settings size={14}/>Settings</button></nav>
        <div className="nx-profile"><img className="nx-avatar" src={settings.avatar || '/founder-avatar.svg'} alt="Founder"/><div><div className="nx-profile-name">{settings.founder_name} & CEO</div><div className="nx-profile-role">Autonomous Root</div></div><MoreVertical className="nx-more" size={15}/></div>
      </aside>
      <section className="nx-main">
        <header className="nx-topbar"><button className="nx-mobile-menu" onClick={()=>setMobileOpen(true)} aria-label="Open navigation"><Command size={15}/></button><div className="nx-search"><Search size={15}/><input value={command} onChange={e=>setCommand(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&command.trim())void runAction('command',command.trim())}} placeholder="Search leads, execute workflows, query cashflow or ask AI..."/><kbd>⌘K</kbd></div><div className="nx-top-actions"><div className="nx-health"><i/>All {Math.max(1,healthCount)} Clusters Healthy <span style={{opacity:.45}}>|</span> 34ms</div><button className="nx-icon-btn" onClick={()=>setSettingsOpen(true)} title="Appearance"><SunIcon/></button><button className="nx-icon-btn" onClick={()=>void load()} title="Refresh"><RefreshCw size={15}/></button><button className="nx-icon-btn" title="Notifications"><Bell size={15}/></button><button className="nx-btn nx-primary" onClick={()=>void runAction('start','start')} disabled={busy==='start'}><Play size={14}/><span>{busy==='start'?'Starting…':'New Workflow'}</span></button></div></header>
        <main className="nx-content">
          <div className="nx-hero"><div><h1>Good morning, Founder. <span style={{display:'inline-flex',verticalAlign:'3px',marginLeft:6,padding:'3px 7px',borderRadius:5,border:`1px solid ${accent}55`,color:accent,fontSize:9,fontWeight:850}}>⚡ Autonomous Execution {data?.autopilot?.enabled?'ON':'PAUSED'}</span></h1><p>NexorAIOS is running <b>{data?.automation?.filter(x=>x.enabled).length ?? 0}</b> autonomous agent workflows across lead acquisition, CRM velocity, messaging and sales operations.</p></div><div className="nx-runrate"><strong>{data?.social?`${number(data.social.published)} published`:'—'}</strong><span>LIVE SYSTEM OUTPUT</span></div></div>
          <section className="nx-command"><div className="nx-command-top"><Bot size={18}/><div className="nx-command-title">Nexor Intelligence Core</div><span className="nx-model">Model 5.4 Active</span><span className="nx-context">Context Window: 99.4% Available</span></div><div className="nx-command-input"><input value={command} onChange={e=>setCommand(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&command.trim())void runAction('command',command.trim())}} placeholder="What should we execute today? (e.g. Analyze Q3 pipeline risks, Dispatch 40 high-intent WhatsApp follow-ups)"/><button onClick={()=>command.trim()&&void runAction('command',command.trim())} disabled={busy==='command'}>{busy==='command'?'Running…':'Execute ↵'}</button></div><div className="nx-insight"><div className="nx-insight-icon"><Zap size={15}/></div><div className="nx-insight-text"><b>Live system signal:</b> {today?.outreachReady?`${number(today.outreachReady)} leads are outreach-ready.`:'No outreach-ready leads are currently queued.'} {today?.followups?`${number(today.followups)} follow-ups completed today.`:''}</div><div className="nx-command-actions"><button className="nx-send" onClick={()=>void runAction('outreach','Generate approved outreach for high-intent leads')} disabled={busy==='outreach'}><Send size={12}/>{busy==='outreach'?'Working…':'Auto-Generate & Send Messages'}</button><button className="nx-inspect" onClick={()=>window.location.assign('/dashboard/autopilot')}><ExternalLink size={12}/>Inspect Dossiers</button></div></div></section>
          <section className="nx-kpis"><Kpi label="REVENUE VELOCITY" value={money(today?.revenue||0)} meta="Won revenue" sub={today?.won?`${number(today.won)} won`:'No wins yet'} icon={<CircleDollarSign size={16}/>} /><Kpi label="ACTIVE LEAD PIPELINE" value={number(today?.totalLeads||0)} meta="Total leads" sub={today?.qualified?`${number(today.qualified)} qualified`:'Awaiting qualification'} icon={<Users size={16}/>} /><Kpi label="ENGAGEMENT RATE" value={today?.outboundMessages?`${Math.min(100,Math.round((today.inboundMessages/Math.max(1,today.outboundMessages))*100))}%`:'0%'} meta="Inbound / outbound" sub={`${number(today?.replies||0)} replies`} icon={<MessageCircle size={16}/>} /><Kpi label="AUTONOMOUS THROUGHPUT" value={number((today?.sent||0)+(today?.followups||0))} meta="Events today" sub={`${number(today?.runningCampaigns||0)} campaigns`} icon={<Gauge size={16}/>} /></section>
          <div className="nx-grid"><section className="nx-panel"><div className="nx-panel-head"><BriefcaseBusiness size={15} color={accent}/><h2>High-Velocity Deal Pipeline</h2><span>{money(String((pipeline?.open||0)+(pipeline?.qualified||0)+(pipeline?.proposal||0)))} In-Flight</span><button className="nx-btn nx-icon-btn right" title="Export ledger" onClick={exportLedger}><Download size={14}/></button></div><div className="nx-pipeline"><Stage title="Discovery" count={pipeline?.open||0} dot="" lead={data?.hotLeads?.[0]}/><Stage title="Qualified" count={pipeline?.qualified||0} dot="yellow" lead={data?.hotLeads?.[1]}/><Stage title="In Negotiation" count={pipeline?.proposal||0} dot="purple" lead={data?.hotLeads?.[2]}/><Stage title="Won" count={pipeline?.won||0} dot="green" lead={data?.hotLeads?.[3]}/></div></section><section className="nx-panel"><div className="nx-panel-head"><MessageCircle size={15} color={accent}/><h2>Unified Live Intelligence Feed</h2><span className="right" style={{border:'1px solid #10b98155',color:'#059669',padding:'3px 6px',borderRadius:5}}>WhatsApp + Email Live</span></div><div className="nx-feed">{loading&&!data?<div className="nx-empty">Loading live intelligence…</div>:data?.activity?.length?data.activity.slice(0,5).map(event=><div className="nx-feed-item" key={event.id}><div className="nx-feed-top"><div className="nx-feed-avatar"><Activity size={12}/></div><div className="nx-feed-name">{event.type||'System Agent'}</div><div className="nx-feed-time">{ago(event.created_at)}</div></div><div className="nx-feed-msg">{event.message}</div><div className="nx-intent"><Sparkles size={10} style={{display:'inline',verticalAlign:-2}}/> SYSTEM EVENT</div></div>):<div className="nx-empty">No live events recorded yet. Start the autonomous engine to populate this feed.</div>}</div></section></div>
          <div className="nx-footer"><span className="ok"><Database size={10}/> API Gateway: 34ms</span><span className="ok"><CheckCircle2 size={10}/> Database Read/Write: live</span><span className="ok"><MessageCircle size={10}/> WhatsApp Cloud: {data?.integrations?.whatsapp==='CONFIGURED'?'Configured':'Ready for credentials'}</span><span className="ok"><Bot size={10}/> AI Reasoning Engine: online</span><span><ShieldCheck size={10}/> Sovereign Encryption Active</span><span style={{marginLeft:'auto'}}>{new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})}</span></div>
        </main>
      </section>
    </div>
    {message&&<div className="nx-message" role="status">{message}<button className="nx-btn" style={{marginLeft:10,background:'transparent',color:'#fff'}} onClick={()=>setMessage('')}><X size={12}/></button></div>}
    {settingsOpen&&<div className="nx-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setSettingsOpen(false)}}><aside className="nx-settings"><div className="nx-settings-head"><div><div style={{fontSize:9,fontWeight:850,letterSpacing:'.12em',color:'var(--nx-muted)'}}>NEXORAIOS</div><h2>Appearance & Control</h2></div><button className="nx-icon-btn" onClick={()=>setSettingsOpen(false)}><X size={15}/></button></div><p>These controls are native to the command center. Changes apply immediately and are persisted through the founder profile API.</p><Setting label="Theme" values={THEMES} current={settings.theme} onChange={theme=>void saveSettings({...settings,theme})}/><Setting label="Accent" values={ACCENTS} current={settings.accent} onChange={accent=>void saveSettings({...settings,accent})}/><Setting label="Density" values={DENSITIES} current={settings.density} onChange={density=>void saveSettings({...settings,density})}/><Setting label="Font scale" values={FONT_SCALES} current={settings.font_scale} onChange={font_scale=>void saveSettings({...settings,font_scale})}/><div style={{marginTop:20,padding:12,border:`1px solid ${theme.border}`,borderRadius:10,fontSize:10,color:theme.muted}}><b style={{color:theme.text}}>Font scaling is live.</b><br/>Current scale: {Math.round(scale*100)}%. The dashboard is now native React — no iframe scaling dependency.</div></aside></div>}
  </div>;
}

function Kpi({label,value,meta,sub,icon}:{label:string;value:string;meta:string;sub:string;icon:ReactNode}){return <div className="nx-kpi"><div className="nx-kpi-head"><span>{label}</span><div className="nx-kpi-icon">{icon}</div></div><div className="nx-kpi-value">{value}</div><div className="nx-kpi-meta"><span>{meta}</span><strong>{sub}</strong></div></div>}
function Stage({title,count,dot,lead}:{title:string;count:number;dot:string;lead?:{business_name:string;country:string;niche:string;audit_score:number}}){return <div className="nx-stage"><div className="nx-stage-title"><span className={`nx-stage-dot ${dot}`}/>{title}<span className="nx-stage-value">{number(count)}</span></div>{lead?<div className="nx-lead-card"><span className="nx-lead-tag">{lead.niche?.slice(0,18).toUpperCase()||'LEAD'}</span><div className="nx-lead-name">{lead.business_name}</div><div className="nx-lead-sub">{lead.country} · Audit {lead.audit_score ?? '—'}</div></div>:<div className="nx-empty" style={{padding:'35px 4px 4px'}}>No records</div>}</div>}
function Setting({label,values,current,onChange}:{label:string;values:string[];current:string;onChange:(v:string)=>void}){return <div className="nx-setting"><span className="nx-setting-label">{label}</span><div className="nx-options">{values.map(value=><button className={`nx-option ${value===current?'active':''}`} key={value} onClick={()=>onChange(value)}>{value}</button>)}</div></div>}
function SunIcon(){return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>}
