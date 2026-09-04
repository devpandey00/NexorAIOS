'use client';

import { useMemo, useState } from 'react';

const TOOLS = [
  ['Lead Hunter Pro','LEAD_HUNTER','Find and rank the best existing prospects.'],['Website Audit Bot','WEBSITE_AUDIT','Turn website weaknesses into specific sales angles.'],['Social Audit Bot','SOCIAL_AUDIT','Identify public social content and conversion gaps.'],['Personalized Outreach','OUTREACH','Generate channel-specific personalized outreach.'],['Follow-up Autopilot','FOLLOW_UP','Create a safe 1/3/7/14-day follow-up plan.'],['Lead Qualification AI','QUALIFY','Classify a reply and recommend the next CRM action.'],['Proposal Generator','PROPOSAL','Draft a branded proposal from opportunity data.'],['Sales Call Copilot','ASK_NEXOR','Use the command assistant for live sales questions.'],['Deal Closer','DEAL','Move verified opportunities through closing stages.'],
  ['Trend Radar','TREND_RADAR','Surface reusable content trends.'],['Content Factory','CONTENT_FACTORY','Create a multi-platform content pack.'],['Reel Script Generator','REEL_SCRIPT','Generate hook, scenes, voiceover and CTA.'],['Creative Director AI','CREATIVE_DIRECTOR','Build original creative briefs from inspiration.'],['Content Calendar AI','CONTENT_CALENDAR','Generate a 30/60-day draft calendar.'],['Performance Learner','PERFORMANCE_LEARNER','Learn from real social content records.'],['Repurpose Engine','REPURPOSE','Turn one source into ten content formats.'],['Competitor Watch','COMPETITOR_WATCH','Structure public competitor intelligence.'],
  ['Daily CEO Briefing','CEO_BRIEF','See sales, finance, operations and priorities.'],['Ask Nexor AI','ASK_NEXOR','Ask the command center questions.'],['AI Task Manager','TASK_PRIORITIZER','Prioritize open tasks.'],['AI Memory','AI_MEMORY','Retrieve a real CRM memory snapshot.'],['Risk Radar','RISK_RADAR','Detect overdue and operational risks.'],
  ['Cashflow Dashboard','CASHFLOW','Review invoice and payment cashflow.'],['Invoice Reminder AI','INVOICE_REMINDER','Draft an approval-first invoice reminder.'],['Client Profitability','PROFITABILITY','Calculate revenue, cost and margin.'],['Monthly P&L Assistant','PNL','Calculate a simple P&L snapshot.'],['Payment Follow-up','PAYMENT_FOLLOWUP','Draft an approval-first payment follow-up.'],
  ['Client Health Score','CLIENT_HEALTH','Score client health from supplied real signals.'],['Monthly Report Generator','REPORT','Create a report structure from live command-center data.'],['Campaign Performance Report','REPORT','Create a campaign/client report structure.'],['Client Renewal Radar','RENEWAL','Combine client health with renewal guidance.']
] as const;

export default function GrowthToolsWorkspace({ initialTool }: { initialTool?: string }) {
  const initial = useMemo(() => TOOLS.find(x => x[1] === initialTool) ?? TOOLS[0], [initialTool]);
  const [selected, setSelected] = useState(initial);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true); setResult(null);
    try {
      const parsed = input ? JSON.parse(input) : {};
      const res = await fetch('/api/growth/tools', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: selected[1], input: parsed }) });
      setResult(await res.json());
    } catch (e) { setResult({ success: false, error: e instanceof Error ? e.message : 'Invalid JSON input' }); }
    finally { setLoading(false); }
  }

  return <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
    <aside className="nexor-panel p-3 max-h-[70vh] overflow-auto">
      <div className="px-3 py-2 font-mono text-[7px] tracking-[0.16em] text-[var(--text-muted)]">AI GROWTH TOOLKIT</div>
      <div className="space-y-1">{TOOLS.map(tool => <button key={tool[0]} onClick={() => {setSelected(tool);setResult(null)}} className={`w-full rounded-xl px-3 py-2.5 text-left text-[9px] ${selected[0] === tool[0] ? 'bg-[var(--surface-3)] text-[var(--text)]' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)]'}`}>{tool[0]}</button>)}</div>
    </aside>
    <section className="nexor-panel p-6">
      <div className="font-mono text-[7px] tracking-[0.16em] text-[var(--accent)]">LIVE TOOL</div>
      <h2 className="mt-2 text-2xl font-semibold text-[var(--text)]">{selected[0]}</h2>
      <p className="mt-2 text-[10px] leading-5 text-[var(--text-secondary)]">{selected[2]}</p>
      <label className="mt-6 block font-mono text-[7px] tracking-[0.12em] text-[var(--text-muted)]">INPUT JSON · optional</label>
      <textarea value={input} onChange={e => setInput(e.target.value)} placeholder='{"businessName":"Example Business","website":"https://example.com"}' className="mt-2 min-h-36 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 font-mono text-[9px] text-[var(--text)] outline-none" />
      <button disabled={loading} onClick={run} className="mt-4 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-[9px] font-bold text-black disabled:opacity-50">{loading ? 'RUNNING…' : 'RUN TOOL'}</button>
      {result && <pre className="mt-5 max-h-[55vh] overflow-auto rounded-xl bg-[var(--surface-2)] p-4 text-[8px] leading-4 text-[var(--text-secondary)]">{JSON.stringify(result, null, 2)}</pre>}
    </section>
  </div>;
}
