'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';

const metrics = [
  ['1,284', 'TOTAL LEADS', '+18.4%', '◉'],
  ['347', 'QUALIFIED', '+12.1%', '◆'],
  ['192', 'OUTREACH READY', '+31.8%', '↗'],
  ['41', 'POSITIVE REPLIES', '+9.4%', '✦'],
];

const agents = [
  ['Lead Hunter', 'Discovery & qualification', 'RUNNING', '●'],
  ['Research Analyst', 'Website intelligence', 'RUNNING', '◈'],
  ['Sales Strategist', 'Personalized outreach', 'READY', '◇'],
  ['Follow-up Agent', 'Pipeline follow-ups', 'IDLE', '○'],
];

export default function CommandCenter() {
  const [command, setCommand] = useState('');
  const [running, setRunning] = useState(false);

  async function runCommand() {
    if (!command.trim() || running) return;

    setRunning(true);

    try {
      const response = await fetch('/api/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: command,
        }),
      });

      const data = await response.json();

      console.log('[NEXOR COMMAND]', data);
    } catch (error) {
      console.error('[NEXOR COMMAND]', error);
    } finally {
      setRunning(false);
    }
  }

  return (
    <DashboardLayout>
      <main className="nexor-fade min-h-full">
        <div className="mx-auto max-w-[1500px] space-y-5">
          {/* HEADER */}
          <section className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                <span className="font-mono text-[8px] font-semibold tracking-[0.22em] text-emerald-500">
                  COMMAND CENTER · ONLINE
                </span>
              </div>

              <h1 className="text-[34px] font-semibold tracking-[-0.04em] text-[var(--text)] md:text-[36px]">
                Good evening, Dev.
              </h1>

              <p className="mt-1.5 text-[12px] text-[var(--text-secondary)]">
                Your AI workforce is ready for its next assignment.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5">
                <div className="font-mono text-[7px] tracking-[0.18em] text-[var(--text-muted)]">
                  SYSTEM
                </div>

                <div className="mt-1 flex items-center gap-1.5 text-[9px] font-semibold text-emerald-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  OPERATIONAL
                </div>
              </div>
            </div>
          </section>

          {/* COMMAND BAR */}
          <section className="nexor-panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3.5">
              <div className="flex items-center gap-2">
                <span className="text-[var(--accent)]">✦</span>

                <span className="text-[11px] font-semibold text-[var(--text)]">Command Nexor</span>
              </div>

              <span className="font-mono text-[7px] tracking-wider text-[var(--text-muted)]">
                NATURAL LANGUAGE
              </span>
            </div>

            <div className="p-5">
              <textarea
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    runCommand();
                  }
                }}
                rows={2}
                placeholder="Tell Nexor what you want done..."
                className="w-full resize-none bg-transparent text-[15px] leading-7 text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]"
              />

              <div className="mt-4 flex flex-col gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  {['Find leads', 'Research market', 'Run campaign', 'Analyze pipeline'].map(
                    (item) => (
                      <button
                        key={item}
                        onClick={() => setCommand(item)}
                        className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-[9px] text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text)]"
                      >
                        {item}
                      </button>
                    ),
                  )}
                </div>

                <button
                  onClick={runCommand}
                  disabled={!command.trim() || running}
                  className="rounded-lg bg-[var(--accent)] px-5 py-2.5 text-[9px] font-bold tracking-[0.12em] text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {running ? 'RUNNING...' : 'START NEXOR →'}
                </button>
              </div>
            </div>
          </section>

          {/* METRICS */}
          <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {metrics.map(([value, label, delta, icon]) => (
              <div key={label} className="nexor-panel nexor-panel-hover p-4">
                <div className="flex items-center justify-between">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[10px] text-[var(--accent)]">
                    {icon}
                  </div>

                  <span className="font-mono text-[8px] text-emerald-500">{delta}</span>
                </div>

                <div className="mt-4 text-[29px] font-semibold tracking-[-0.03em] text-[var(--text)]">
                  {value}
                </div>

                <div className="mt-1 font-mono text-[7px] tracking-[0.16em] text-[var(--text-muted)]">
                  {label}
                </div>
              </div>
            ))}
          </section>

          {/* CAMPAIGN + WORKFORCE */}
          <section className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
            {/* CAMPAIGN */}
            <div className="nexor-panel">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                <div>
                  <div className="text-[11px] font-semibold text-[var(--text)]">
                    Active Campaign
                  </div>

                  <div className="mt-1 text-[8px] text-[var(--text-muted)]">
                    Autonomous campaign operations
                  </div>
                </div>

                <span className="rounded-full border border-emerald-500/15 bg-emerald-500/[0.05] px-2 py-1 font-mono text-[7px] text-emerald-500">
                  READY
                </span>
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-[18px] font-semibold tracking-tight text-[var(--text)]">
                      No campaign running
                    </h2>

                    <p className="mt-1 max-w-lg text-[10px] leading-5 text-[var(--text-secondary)]">
                      Start an assignment and Nexor will coordinate research, qualification and
                      outreach.
                    </p>
                  </div>

                  <span className="font-mono text-[20px] text-[var(--text-muted)]">00%</span>
                </div>

                <div className="mt-6">
                  <div className="flex justify-between font-mono text-[7px] text-[var(--text-muted)]">
                    <span>PROGRESS</span>
                    <span>0 / 0</span>
                  </div>

                  <div className="mt-2 h-1.5 rounded-full bg-[var(--surface-3)]">
                    <div className="h-full w-0 rounded-full bg-[var(--accent)]" />
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3">
                  {[
                    ['0', 'DISCOVERED'],
                    ['0', 'ANALYZED'],
                    ['0', 'QUALIFIED'],
                  ].map(([value, label]) => (
                    <div key={label}>
                      <div className="text-[18px] font-semibold text-[var(--text)]">{value}</div>

                      <div className="mt-1 font-mono text-[7px] tracking-[0.14em] text-[var(--text-muted)]">
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* AI WORKFORCE */}
            <div className="nexor-panel">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
                <div>
                  <div className="text-[11px] font-semibold text-[var(--text)]">AI Workforce</div>

                  <div className="mt-1 text-[8px] text-[var(--text-muted)]">Digital employees</div>
                </div>

                <span className="font-mono text-[7px] text-[var(--text-muted)]">4 AGENTS</span>
              </div>

              <div>
                {agents.map(([name, role, status, icon]) => (
                  <div
                    key={name}
                    className="flex items-center gap-3 border-b border-[var(--border)] px-5 py-3.5 last:border-0"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[10px] text-[var(--accent)]">
                      {icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-semibold text-[var(--text)]">{name}</div>

                      <div className="mt-0.5 text-[8px] text-[var(--text-muted)]">{role}</div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={[
                          'h-1.5 w-1.5 rounded-full',
                          status === 'RUNNING'
                            ? 'bg-emerald-400'
                            : status === 'READY'
                              ? 'bg-[var(--accent)]'
                              : 'bg-[var(--text-muted)]',
                        ].join(' ')}
                      />

                      <span className="font-mono text-[7px] text-[var(--text-muted)]">
                        {status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ACTIVITY */}
          <section className="nexor-panel">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <div>
                <div className="text-[11px] font-semibold text-[var(--text)]">Live Operations</div>

                <div className="mt-1 text-[8px] text-[var(--text-muted)]">
                  Real-time Nexor activity
                </div>
              </div>

              <div className="flex items-center gap-1.5 font-mono text-[7px] text-emerald-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                LIVE
              </div>
            </div>

            <div className="divide-y divide-[var(--border)]">
              {[
                ['21:43:18', 'SYSTEM', 'Waiting for next command'],
                ['21:42:07', 'AI', 'Campaign engine ready'],
                ['21:41:32', 'DATABASE', 'Lead database connected'],
                ['21:40:51', 'RESEARCH', 'Research service online'],
              ].map(([time, type, message]) => (
                <div key={time} className="flex items-center gap-4 px-5 py-3">
                  <span className="w-14 font-mono text-[7px] text-[var(--text-muted)]">{time}</span>

                  <span className="rounded-md bg-[var(--surface-2)] px-2 py-1 font-mono text-[7px] text-[var(--text-secondary)]">
                    {type}
                  </span>

                  <span className="text-[9px] text-[var(--text-secondary)]">{message}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </DashboardLayout>
  );
}
