import { OpenChatCutMcpClient } from './openchatcut-mcp';
type Json = Record<string, unknown>;
type Short = { timelineId: string; title: string; startFrame: number; endFrame: number; ratio: string };
function obj(value: unknown): Json { return value && typeof value === 'object' && !Array.isArray(value) ? value as Json : {}; }
function projectEditorUrl(projectId: string): string { const base = process.env.OPENCHATCUT_EDITOR_URL?.trim() || 'http://127.0.0.1:5199'; return `${base.replace(/\/+$/, '')}/#/editor/${encodeURIComponent(projectId)}`; }
export async function createVideoSession(input: { filename: string; contentType: string; size: number }): Promise<Json> {
  const client = new OpenChatCutMcpClient();
  try {
    const project = obj(await client.callTool('create_project', { name: `Nexor Video · ${input.filename.replace(/\.[^.]+$/, '')}`.slice(0, 80), description: 'Nexor autonomous marketing-video project', compositionWidth: 1920, compositionHeight: 1080, fps: 30, editorBaseUrl: process.env.OPENCHATCUT_EDITOR_URL?.trim() || undefined }));
    const projectId = String(project.id || project.projectId || '').trim();
    if (!projectId) throw new Error('OpenChatCut did not return a project id');
    await client.callTool('target_project', { projectId });
    const importSession = obj(await client.callTool('import_media', { action: 'create_session', assetType: 'video', filename: input.filename, contentType: input.contentType || 'video/mp4', size: input.size }));
    const slot = Array.isArray(importSession.slots) ? obj(importSession.slots[0]) : {};
    const uploadUrl = String(slot.uploadUrl || '').trim(), sessionId = String(importSession.sessionId || '').trim();
    if (!uploadUrl || !sessionId) throw new Error('OpenChatCut did not return an upload slot');
    return { projectId, sessionId, uploadUrl, uploadHeaders: obj(slot.headers), filename: input.filename, contentType: input.contentType || 'video/mp4', size: input.size, expiresAt: Number(slot.expiresAt || 0), editorUrl: String(project.editorUrl || projectEditorUrl(projectId)) };
  } finally { await client.close(); }
}
export async function finalizeAndBuild(input: { projectId: string; receipt: string; durationInSeconds: number; width?: number; height?: number; fps?: number; hasAudioTrack?: boolean; count: number; instruction?: string }): Promise<Json> {
  const client = new OpenChatCutMcpClient();
  try {
    await client.callTool('target_project', { projectId: input.projectId });
    const finalized = obj(await client.callTool('finalize_uploaded_asset', { receipt: input.receipt, assetType: 'video', durationInSeconds: input.durationInSeconds, width: input.width, height: input.height, fps: input.fps, hasAudioTrack: input.hasAudioTrack !== false }));
    const assetId = String(finalized.assetId || finalized.id || '').trim();
    if (!assetId) throw new Error('OpenChatCut did not return the imported asset id');
    await client.callTool('edit_item', { adds: [{ type: 'video', assetId, track: 'V1', fromFrame: 0, durationInFrames: Math.max(1, Math.round(input.durationInSeconds * (input.fps || 30))) }] });
    const trackResult = obj(await client.callTool('edit_track', { action: 'create', json: JSON.stringify({ trackType: 'audio', count: 1, name: 'Nexor Music', role: 'follower', audioRouting: { duckDepthDb: -14 } }) }));
    const createdTracks = Array.isArray(trackResult.created) ? trackResult.created : [];
    const musicTrack = createdTracks.length ? String(obj(createdTracks[0]).alias || obj(createdTracks[0]).id || 'A1') : 'A1';
    await client.callTool('remove_silence', { thresholdDb: -28, minSilenceMs: 700, padMs: 140 });
    await client.callTool('transcribe_track', { track: 'V1' });
    await client.callTool('auto_grade', { action: 'apply' });
    const audio = await client.callTool('list_audio', {}), audioRows = Array.isArray(audio) ? audio.map(obj) : [];
    const preferred = audioRows.find((row) => /cinematic pulse/i.test(String(row.name || ''))) || audioRows.find((row) => String(row.category || '') === 'music');
    if (preferred?.name) {
      await client.callTool('add_audio', { audioName: String(preferred.name), track: musicTrack, startFrame: 0 });
      const timeline = obj(await client.callTool('read_timeline', {})), items = Array.isArray(timeline.items) ? timeline.items.map(obj) : [];
      const musicItem = items.find((item) => String(item.track || '') === musicTrack && String(item.kind || '') === 'audio');
      if (musicItem?.id) await client.callTool('edit_item', { updates: [{ type: 'audio', itemId: String(musicItem.id), volume: 0.14 }] });
    }
    const highlights = obj(await client.callTool('find_highlights', { count: Math.max(1, Math.min(12, input.count)), ratio: '9:16', minSeconds: 12, maxSeconds: 60, instruction: input.instruction || 'Create strong agency-marketing reels: hook fast, self-contained value, clear business insight, energetic pacing, and a natural CTA ending.' }));
    const shorts = Array.isArray(highlights.shorts) ? highlights.shorts.map(obj) as Short[] : [];
    if (!shorts.length) throw new Error('OpenChatCut could not create any highlights');
    const enriched: Json[] = [];
    for (const short of shorts) {
      const timelineId = String(short.timelineId || '').trim(); if (!timelineId) continue;
      await client.callTool('manage_timelines', { action: 'switch', timelineId });
      await client.callTool('edit_captions', { action: 'enable', preset: 'product' });
      await client.callTool('edit_captions', { action: 'template', templatePreset: 'product' });
      await client.callTool('edit_captions', { action: 'animation', motionPreset: 'word-pop' });
      await client.callTool('edit_captions', { action: 'style', json: JSON.stringify({ fontWeight: 800, strokeWidth: 2, shadowStrength: 0.35, pacing: 'phrase' }) });
      const timeline = obj(await client.callTool('read_timeline', {})), items = Array.isArray(timeline.items) ? timeline.items.map(obj) : [];
      const mainVideo = items.find((item) => String(item.kind || '') === 'video');
      if (mainVideo?.id) await client.callTool('edit_item', { updates: [{ type: 'video', itemId: String(mainVideo.id), backgroundFill: true, backgroundFillStrength: 18, transform: { scale: 1.035 } }] });
      enriched.push({ timelineId, title: String(short.title || 'Nexor Reel'), ratio: '9:16', startFrame: Number(short.startFrame || 0), endFrame: Number(short.endFrame || 0), editorUrl: projectEditorUrl(input.projectId) });
    }
    return { ok: true, projectId: input.projectId, assetId, shorts: enriched, editorUrl: projectEditorUrl(input.projectId) };
  } finally { await client.close(); }
}
export async function submitRender(input: { projectId: string; timelineId: string; name?: string }): Promise<Json> {
  const client = new OpenChatCutMcpClient();
  try { await client.callTool('target_project', { projectId: input.projectId }); await client.callTool('manage_timelines', { action: 'switch', timelineId: input.timelineId }); const result = obj(await client.callTool('submit_render_job', { format: 'video', codec: 'h264', resolution: '1080p', fps: 30, name: input.name || `nexor-reel-${input.timelineId}.mp4` })); return { ...result, projectId: input.projectId, timelineId: input.timelineId }; }
  finally { await client.close(); }
}
export async function renderStatus(input: { projectId: string; renderId: string }): Promise<Json> {
  const client = new OpenChatCutMcpClient();
  try { await client.callTool('target_project', { projectId: input.projectId }); return { ...obj(await client.callTool('track_export', { action: 'status', renderIds: input.renderId })), projectId: input.projectId, renderId: input.renderId }; }
  finally { await client.close(); }
}
