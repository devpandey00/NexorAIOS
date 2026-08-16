'use client';

import { useEffect, useMemo, useState } from 'react';

type Platform = 'INSTAGRAM' | 'FACEBOOK' | 'LINKEDIN' | 'YOUTUBE' | 'X' | 'TIKTOK';
type Status = 'DRAFT' | 'REVIEW' | 'APPROVED' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED';

type Post = {
  id: string;
  platform: Platform;
  status: Status;
  title: string;
  caption: string;
  hashtags: string[];
  mediaUrl: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
};

const platforms: Platform[] = ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'YOUTUBE', 'X', 'TIKTOK'];
const statuses: Status[] = ['DRAFT', 'REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'FAILED'];

function startOfDay(value = new Date()) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function ContentCalendarWorkspace() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [platform, setPlatform] = useState<Platform>('INSTAGRAM');
  const [niche, setNiche] = useState('digital marketing');
  const [goal, setGoal] = useState('generate qualified leads');
  const [offer, setOffer] = useState('Google Ads + Meta Ads');
  const [audience, setAudience] = useState('small and local businesses');
  const [scheduledAt, setScheduledAt] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadPosts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/social/content?limit=100', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error ?? 'Failed to load content');
      setPosts(payload.posts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPosts();
  }, []);

  const days = useMemo(() => {
    const today = startOfDay();
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(date.getDate() + index);
      return date;
    });
  }, []);

  const postsByDay = useMemo(() => {
    const grouped = new Map<string, Post[]>();
    for (const post of posts) {
      const date = post.scheduledAt ? startOfDay(post.scheduledAt) : startOfDay(post.createdAt);
      const key = date.toISOString().slice(0, 10);
      const current = grouped.get(key) ?? [];
      current.push(post);
      grouped.set(key, current);
    }
    return grouped;
  }, [posts]);

  const counts = useMemo(() => ({
    drafts: posts.filter((post) => post.status === 'DRAFT').length,
    review: posts.filter((post) => post.status === 'REVIEW').length,
    scheduled: posts.filter((post) => post.status === 'SCHEDULED').length,
    published: posts.filter((post) => post.status === 'PUBLISHED').length,
  }), [posts]);

  const generate = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/social/content/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ platform, niche, goal, offer, audience }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error ?? 'Generation failed');
      await loadPosts();
      setSelectedId(payload.post?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async (id: string, status: Status) => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/social/content/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status, scheduledAt: status === 'SCHEDULED' ? (scheduledAt || new Date(Date.now() + 60 * 60 * 1000).toISOString()) : undefined }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error ?? 'Update failed');
      setScheduledAt('');
      await loadPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const selected = posts.find((post) => post.id === selectedId) ?? posts[0] ?? null;

  return (
    <section className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        {[
          ['DRAFTS', counts.drafts],
          ['IN REVIEW', counts.review],
          ['SCHEDULED', counts.scheduled],
          ['PUBLISHED', counts.published],
        ].map(([label, value]) => (
          <div key={String(label)} className="nexor-panel p-5">
            <div className="font-mono text-[7px] tracking-[0.15em] text-[var(--text-muted)]">{label}</div>
            <div className="mt-2 text-2xl font-semibold text-[var(--text)]">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_1.9fr]">
        <div className="nexor-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-[7px] tracking-[0.15em] text-[var(--text-muted)]">CONTENT FACTORY</div>
              <h2 className="mt-2 text-xl font-semibold text-[var(--text)]">Create a post</h2>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1.5 font-mono text-[7px] text-emerald-500">REAL API</span>
          </div>

          <div className="mt-5 space-y-4">
            <label className="block text-[8px] text-[var(--text-muted)]">PLATFORM
              <select value={platform} onChange={(event) => setPlatform(event.target.value as Platform)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-[10px] text-[var(--text)]">
                {platforms.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="block text-[8px] text-[var(--text-muted)]">NICHE
              <input value={niche} onChange={(event) => setNiche(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-[10px] text-[var(--text)]" />
            </label>
            <label className="block text-[8px] text-[var(--text-muted)]">GOAL
              <input value={goal} onChange={(event) => setGoal(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-[10px] text-[var(--text)]" />
            </label>
            <label className="block text-[8px] text-[var(--text-muted)]">OFFER
              <input value={offer} onChange={(event) => setOffer(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-[10px] text-[var(--text)]" />
            </label>
            <label className="block text-[8px] text-[var(--text-muted)]">AUDIENCE
              <input value={audience} onChange={(event) => setAudience(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-[10px] text-[var(--text)]" />
            </label>
            <button disabled={busy} onClick={() => void generate()} className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-[9px] font-bold text-black disabled:opacity-50">
              {busy ? 'WORKING…' : 'GENERATE AI POST'}
            </button>
            {error ? <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-[9px] text-red-400">{error}</div> : null}
          </div>
        </div>

        <div className="nexor-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--border)] p-5">
            <div>
              <div className="font-mono text-[7px] tracking-[0.15em] text-[var(--text-muted)]">7-DAY PLAN</div>
              <h2 className="mt-2 text-xl font-semibold text-[var(--text)]">Publishing calendar</h2>
            </div>
            <button onClick={() => void loadPosts()} className="rounded-lg border border-[var(--border)] px-3 py-2 text-[8px] text-[var(--text-secondary)] hover:text-[var(--text)]">Refresh</button>
          </div>
          <div className="grid gap-px bg-[var(--border)] md:grid-cols-7">
            {days.map((date) => {
              const key = date.toISOString().slice(0, 10);
              const dayPosts = postsByDay.get(key) ?? [];
              return (
                <div key={key} className="min-h-56 bg-[var(--surface)] p-3">
                  <div className="font-mono text-[7px] tracking-[0.12em] text-[var(--text-muted)]">{date.toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase()}</div>
                  <div className="mt-1 text-sm font-semibold text-[var(--text)]">{date.getDate()}</div>
                  <div className="mt-3 space-y-2">
                    {dayPosts.map((post) => (
                      <button key={post.id} onClick={() => setSelectedId(post.id)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2 text-left hover:border-[var(--accent)]/40">
                        <div className="flex items-center justify-between gap-2"><span className="font-mono text-[6px] text-[var(--accent)]">{post.platform}</span><span className="font-mono text-[6px] text-[var(--text-muted)]">{post.status}</span></div>
                        <div className="mt-1 line-clamp-3 text-[8px] leading-4 text-[var(--text-secondary)]">{post.title}</div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="nexor-panel p-6">
          <div className="flex items-center justify-between"><div><div className="font-mono text-[7px] tracking-[0.15em] text-[var(--text-muted)]">CONTENT QUEUE</div><h2 className="mt-2 text-lg font-semibold text-[var(--text)]">Recent posts</h2></div>{loading ? <span className="text-[8px] text-[var(--text-muted)]">Loading…</span> : null}</div>
          <div className="mt-4 divide-y divide-[var(--border)]">
            {posts.length === 0 && !loading ? <div className="py-10 text-center text-[9px] text-[var(--text-muted)]">No content yet. Generate the first post.</div> : null}
            {posts.slice(0, 12).map((post) => (
              <button key={post.id} onClick={() => setSelectedId(post.id)} className="grid w-full grid-cols-[90px_1fr_100px] gap-3 py-3 text-left hover:bg-[var(--surface-2)]">
                <span className="font-mono text-[7px] text-[var(--accent)]">{post.platform}</span>
                <span className="truncate text-[9px] text-[var(--text-secondary)]">{post.title}</span>
                <span className="text-right font-mono text-[7px] text-[var(--text-muted)]">{post.status}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="nexor-panel p-6">
          <div className="font-mono text-[7px] tracking-[0.15em] text-[var(--text-muted)]">SELECTED POST</div>
          {selected ? (
            <div className="mt-4 space-y-4">
              <div><div className="text-sm font-semibold text-[var(--text)]">{selected.title}</div><div className="mt-1 font-mono text-[7px] text-[var(--accent)]">{selected.platform} · {selected.status}</div></div>
              <div className="rounded-xl bg-[var(--surface-2)] p-4 text-[9px] leading-5 text-[var(--text-secondary)] whitespace-pre-wrap">{selected.caption}</div>
              <div className="flex flex-wrap gap-1">{selected.hashtags.map((tag) => <span key={tag} className="rounded-full bg-[var(--surface-3)] px-2 py-1 text-[7px] text-[var(--text-muted)]">{tag}</span>)}</div>
              <input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[8px] text-[var(--text)]" />
              <div className="grid grid-cols-2 gap-2">
                {selected.status === 'DRAFT' ? <button disabled={busy} onClick={() => void updateStatus(selected.id, 'REVIEW')} className="rounded-lg border border-[var(--border)] px-3 py-2 text-[8px] text-[var(--text-secondary)]">Send to review</button> : null}
                {['DRAFT', 'REVIEW'].includes(selected.status) ? <button disabled={busy} onClick={() => void updateStatus(selected.id, 'APPROVED')} className="rounded-lg bg-[var(--accent)] px-3 py-2 text-[8px] font-bold text-black">Approve</button> : null}
                {['APPROVED', 'REVIEW'].includes(selected.status) ? <button disabled={busy} onClick={() => void updateStatus(selected.id, 'SCHEDULED')} className="rounded-lg border border-[var(--accent)]/40 px-3 py-2 text-[8px] text-[var(--accent)]">Schedule</button> : null}
                {selected.status === 'SCHEDULED' ? <button disabled={busy} onClick={() => void updateStatus(selected.id, 'PUBLISHED')} className="rounded-lg border border-emerald-500/30 px-3 py-2 text-[8px] text-emerald-500">Mark published</button> : null}
              </div>
            </div>
          ) : <div className="mt-4 text-[9px] leading-5 text-[var(--text-muted)]">Generate or select a post to manage its workflow.</div>}
        </div>
      </div>
    </section>
  );
}
