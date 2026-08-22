'use client';
import { useEffect, useMemo, useState } from 'react';
type Short = { timelineId: string; title: string; editorUrl: string; renderId?: string; status?: string; downloadUrl?: string };
type Session = { projectId: string; uploadUrl: string; filename: string; contentType: string; editorUrl: string; expiresAt: number };
function prettyStatus(value?: string) { return String(value || 'queued').replace(/[_-]/g, ' ').toUpperCase(); }
export default function VideoAgentPage() {
  const [file, setFile] = useState<File | null>(null), [count, setCount] = useState(6), [instruction, setInstruction] = useState('Agency-style marketing reels: fast hook, useful insight, cinematic pacing, clean captions, and a natural CTA.'), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [shorts, setShorts] = useState<Short[]>([]), [projectId, setProjectId] = useState(''), [editorUrl, setEditorUrl] = useState('');
  const sizeLabel = useMemo(() => file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : 'No video selected', [file]);
  async function start() {
    if (!file || busy) return;
    setBusy(true); setMessage('Connecting to OpenChatCut…'); setShorts([]);
    try {
      const sessionResponse = await fetch('/api/video-agent/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ filename: file.name, contentType: file.type || 'video/mp4', size: file.size }) });
      const session = await sessionResponse.json() as Session & { error?: string };
      if (!sessionResponse.ok) throw new Error(session.error || 'Could not create OpenChatCut session');
      setProjectId(session.projectId); setEditorUrl(session.editorUrl || ''); setMessage('Uploading the source video…');
      const uploadResponse = await fetch('/api/video-agent/upload', { method: 'POST', headers: { 'x-nexor-upload-url': session.uploadUrl, 'content-type': file.type || 'video/mp4', 'content-length': String(file.size) }, body: file });
      const upload = await uploadResponse.json() as { receipt?: string; error?: string };
      if (!uploadResponse.ok || !upload.receipt) throw new Error(upload.error || 'OpenChatCut rejected the upload');
      const metadata = await readMetadata(file);
      setMessage('AI is cutting highlights, captions, pacing and color…');
      const finalizeResponse = await fetch('/api/video-agent/finalize', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ projectId: session.projectId, receipt: upload.receipt, durationInSeconds: metadata.duration, width: metadata.width, height: metadata.height, fps: 30, hasAudioTrack: true, count, instruction }) });
      const result = await finalizeResponse.json() as { shorts?: Short[]; editorUrl?: string; error?: string };
      if (!finalizeResponse.ok) throw new Error(result.error || 'Video pipeline failed');
      const created = result.shorts || []; setShorts(created); setEditorUrl(result.editorUrl || session.editorUrl || ''); setMessage(`${created.length} reels created. Rendering them now…`); await renderAll(session.projectId, created); setMessage('All requested renders have been queued.');
    } catch (error) { setMessage(error instanceof Error ? error.message : String(error)); } finally { setBusy(false); }
  }
  async function renderAll(currentProjectId: string, items: Short[]) {
    const rendered: Short[] = [];
    for (const item of items) {
      try {
        const response = await fetch('/api/video-agent/render', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ projectId: currentProjectId, timelineId: item.timelineId, name: `${item.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 48)}.mp4` }) });
        const result = await response.json() as { renderId?: string };
        rendered.push({ ...item, renderId: result.renderId, status: result.renderId ? 'queued' : 'failed' });
      } catch { rendered.push({ ...item, status: 'failed' }); }
    }
    setShorts(rendered);
  }
  useEffect(() => {
    const active = shorts.filter((item) => item.renderId && !item.downloadUrl && item.status !== 'failed');
    if (!active.length || !projectId) return;
    const timer = window.setInterval(async () => {
      const next = await Promise.all(shorts.map(async (item) => {
        if (!item.renderId || item.downloadUrl || item.status === 'failed') return item;
        try {
          const response = await fetch('/api/video-agent/render-status', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ projectId, renderId: item.renderId }) });
          const result = await response.json() as { status?: string; state?: string; downloadUrl?: string; url?: string };
          return { ...item, status: result.status || result.state || item.status, downloadUrl: result.downloadUrl || result.url || item.downloadUrl };
        } catch { return item; }
      }));
      setShorts(next);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [shorts, projectId]);
  return <main className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
    <section className="nexor-panel overflow-hidden p-6 lg:p-8"><div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-3 inline-flex rounded-full border border-[var(--accent)]/20 bg-[var(--accent-soft)] px-3 py-1.5 font-mono text-[7px] font-semibold tracking-[0.18em] text-[var(--accent)]">NEXOR · VIDEO AGENT</div><h1 className="text-4xl font-semibold tracking-[-0.05em] text-[var(--text)]">Raw footage → publish-ready reels.</h1><p className="mt-3 max-w-2xl text-[11px] leading-6 text-[var(--text-secondary)]">Drop an office video. Nexor sends it through OpenChatCut, finds the strongest moments, converts them to 9:16, tightens pacing, grades the footage, adds music and animated captions, then queues the renders.</p></div><a className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-[9px] font-semibold text-[var(--text)]" href="/dashboard">Back to command center</a></div></section>
    <section className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]"><div className="nexor-panel p-5"><label className="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] p-8 text-center hover:border-[var(--accent)]/40"><input className="hidden" type="file" accept="video/*" onChange={(event) => setFile(event.target.files?.[0] || null)} /><div className="text-4xl">🎬</div><div className="mt-4 text-sm font-semibold text-[var(--text)]">{file ? file.name : 'Drop your raw video here'}</div><div className="mt-2 text-[9px] text-[var(--text-muted)]">{sizeLabel} · MP4, MOV, WebM</div></label><div className="mt-4 flex items-center justify-between"><div><div className="text-[10px] font-semibold text-[var(--text)]">Reels to create</div><div className="text-[8px] text-[var(--text-muted)]">12 maximum</div></div><input className="w-20 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-center text-[10px] text-[var(--text)]" type="number" min={1} max={12} value={count} onChange={(event) => setCount(Math.max(1, Math.min(12, Number(event.target.value) || 1)))} /></div><button disabled={!file || busy} onClick={start} className="mt-4 w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-[10px] font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40">{busy ? 'PROCESSING…' : 'CREATE CINEMATIC REELS'}</button>{message && <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-[9px] leading-5 text-[var(--text-secondary)]">{message}</div>}</div><div className="nexor-panel p-5"><div className="text-[11px] font-semibold text-[var(--text)]">Creative direction</div><textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} className="mt-4 h-40 w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-[9px] leading-5 text-[var(--text)] outline-none" /><div className="mt-4 grid grid-cols-2 gap-2 text-[8px] text-[var(--text-muted)]"><div className="rounded-xl border border-[var(--border)] p-3">9:16 vertical</div><div className="rounded-xl border border-[var(--border)] p-3">H.264 1080p</div><div className="rounded-xl border border-[var(--border)] p-3">AI highlights</div><div className="rounded-xl border border-[var(--border)] p-3">Animated captions</div></div></div></section>
    {shorts.length > 0 && <section className="nexor-panel p-5"><div className="flex items-center justify-between"><div><div className="text-[11px] font-semibold text-[var(--text)]">Generated reels</div><div className="mt-1 text-[8px] text-[var(--text-muted)]">Each sequence remains editable in OpenChatCut.</div></div>{editorUrl && <a href={editorUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-[var(--border)] px-3 py-2 text-[8px] font-semibold text-[var(--text)]">Open project</a>}</div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{shorts.map((item) => <div key={item.timelineId} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4"><div className="font-mono text-[7px] tracking-[0.14em] text-[var(--text-muted)]">9:16 · {prettyStatus(item.status)}</div><div className="mt-2 min-h-10 text-[11px] font-semibold text-[var(--text)]">{item.title}</div>{item.downloadUrl ? <a className="mt-4 block rounded-xl bg-[var(--accent)] px-3 py-2 text-center text-[8px] font-semibold text-black" href={item.downloadUrl} target="_blank" rel="noreferrer">OPEN RENDER</a> : <div className="mt-4 rounded-xl border border-[var(--border)] px-3 py-2 text-center text-[8px] text-[var(--text-muted)]">{prettyStatus(item.status)}</div>}</div>)}</div></section>}
  </main>;
}
async function readMetadata(file: File): Promise<{ duration: number; width?: number; height?: number }> { return new Promise((resolve) => { const url = URL.createObjectURL(file); const video = document.createElement('video'); video.preload = 'metadata'; video.onloadedmetadata = () => { const result = { duration: Number(video.duration), width: video.videoWidth, height: video.videoHeight }; URL.revokeObjectURL(url); video.remove(); resolve(result); }; video.onerror = () => { URL.revokeObjectURL(url); video.remove(); resolve({ duration: 1 }); }; video.src = url; }); }
