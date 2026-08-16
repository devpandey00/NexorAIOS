'use client';

import { useEffect, useMemo, useState } from 'react';

type Post = {
  id: string;
  platform: string;
  status: string;
  title: string;
  caption: string;
  hashtags: string[];
  scheduledAt: string | null;
  createdAt: string;
};

const platforms = ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'YOUTUBE', 'X', 'TIKTOK'];

export default function SocialContentWorkspace() {
  const [platform, setPlatform] = useState('INSTAGRAM');
  const [niche, setNiche] = useState('digital marketing');
  const [goal, setGoal] = useState('generate qualified leads');
  const [offer, setOffer] = useState('Google Ads, Meta Ads, SEO and websites');
  const [audience, setAudience] = useState('premium local service businesses');
  const [tone, setTone] = useState('premium, confident, practical');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const upcoming = useMemo(
    () => posts.filter((post) => post.status === 'SCHEDULED').length,
    [posts],
  );

  async function loadPosts() {
    const response = await fetch('/api/social/content?limit=100', { cache: 'no-store' });
    const data = await response.json();
    if (data.success) setPosts(data.posts);
  }

  useEffect(() => {
    void loadPosts();
  }, []);

  async function generate() {
    setLoading(true);
    setMessage('Generating content…');
    try {
      const response = await fetch('/api/social/content/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ platform, niche, goal, offer, audience, tone }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error ?? 'Generation failed');
      setMessage(data.ai ? 'AI draft created.' : 'Draft created with deterministic fallback.');
      await loadPosts();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  }

  async function approve(id: string) {
    const response = await fetch(`/api/social/content/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'APPROVED' }),
    });
    const data = await response.json();
    if (data.success) await loadPosts();
  }

  async function schedule(id: string) {
    const scheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const response = await fetch(`/api/social/content/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'SCHEDULED', scheduledAt }),
    });
    const data = await response.json();
    if (data.success) await loadPosts();
  }

  return (
    <div className="space-y-5">
      <section className="nexor-panel p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <label className="text-[8px] font-mono tracking-[0.12em] text-[var(--text-muted)]">PLATFORM
            <select value={platform} onChange={(event) => setPlatform(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-[10px] text-[var(--text)]">
              {platforms.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="text-[8px] font-mono tracking-[0.12em] text-[var(--text-muted)]">NICHE<input value={niche} onChange={(event) => setNiche(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-[10px] text-[var(--text)]" /></label>
          <label className="text-[8px] font-mono tracking-[0.12em] text-[var(--text-muted)]">GOAL<input value={goal} onChange={(event) => setGoal(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-[10px] text-[var(--text)]" /></label>
          <label className="text-[8px] font-mono tracking-[0.12em] text-[var(--text-muted)]">OFFER<input value={offer} onChange={(event) => setOffer(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-[10px] text-[var(--text)]" /></label>
          <label className="text-[8px] font-mono tracking-[0.12em] text-[var(--text-muted)]">AUDIENCE<input value={audience} onChange={(event) => setAudience(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-[10px] text-[var(--text)]" /></label>
          <label className="text-[8px] font-mono tracking-[0.12em] text-[var(--text-muted)]">TONE<input value={tone} onChange={(event) => setTone(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-[10px] text-[var(--text)]" /></label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button onClick={generate} disabled={loading} className="rounded-xl bg-[var(--accent)] px-5 py-3 text-[9px] font-bold text-black disabled:opacity-50">{loading ? 'GENERATING…' : 'GENERATE POST'}</button>
          <div className="rounded-xl border border-[var(--border)] px-4 py-3 text-[9px] text-[var(--text-secondary)]">{posts.length} posts · {upcoming} scheduled</div>
          {message && <div className="text-[9px] text-[var(--text-muted)]">{message}</div>}
        </div>
      </section>

      <section className="space-y-3">
        {posts.map((post) => (
          <article key={post.id} className="nexor-panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><div className="font-mono text-[7px] tracking-[0.12em] text-[var(--accent)]">{post.platform} · {post.status}</div><h3 className="mt-2 text-sm font-semibold text-[var(--text)]">{post.title}</h3></div>
              <div className="flex gap-2">{post.status === 'DRAFT' && <button onClick={() => approve(post.id)} className="rounded-lg border border-[var(--border)] px-3 py-2 text-[8px] text-[var(--text-secondary)] hover:text-[var(--text)]">APPROVE</button>}{post.status === 'APPROVED' && <button onClick={() => schedule(post.id)} className="rounded-lg bg-[var(--accent-soft)] px-3 py-2 text-[8px] text-[var(--accent)]">SCHEDULE +1H</button>}</div>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-[10px] leading-5 text-[var(--text-secondary)]">{post.caption}</p>
            <div className="mt-3 flex flex-wrap gap-2">{post.hashtags.map((tag) => <span key={tag} className="rounded-full border border-[var(--border)] px-2 py-1 text-[7px] text-[var(--text-muted)]">{tag}</span>)}</div>
          </article>
        ))}
        {!posts.length && <div className="nexor-panel p-10 text-center text-[9px] text-[var(--text-muted)]">No content yet. Generate the first post above.</div>}
      </section>
    </div>
  );
}
