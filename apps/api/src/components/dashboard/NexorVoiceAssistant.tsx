'use client';

import { useEffect, useRef, useState } from 'react';

type VoiceState = 'standby' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error';
type VoiceLog = { id: number; role: 'you' | 'nexor'; text: string; time: string };

const HIGH_IMPACT = /\b(?:delete|remove|erase|wipe|send|publish|post|approve|reject|pay|charge|transfer|shutdown|disable|disconnect|broadcast|message all)\b/i;
const QUICK_COMMANDS = ['Show today’s priorities', 'Find my hottest leads', 'Run the sales machine', 'Give me a growth briefing'];
const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function NexorVoiceAssistant() {
  const [state, setState] = useState<VoiceState>('standby');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('Nexor JARVIS standing by.');
  const [enabled, setEnabled] = useState(false);
  const [muted, setMuted] = useState(false);
  const [logs, setLogs] = useState<VoiceLog[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const logId = useRef(0);
  const pendingRef = useRef<string | null>(null);
  const pendingCallId = useRef<string | null>(null);
  const mutedRef = useRef(false);

  const addLog = (role: VoiceLog['role'], text: string) => setLogs((items) => [...items.slice(-7), { id: ++logId.current, role, text, time: now() }]);
  const sendEvent = (event: Record<string, unknown>) => { if (dcRef.current?.readyState === 'open') dcRef.current.send(JSON.stringify(event)); };

  const stop = () => {
    dcRef.current?.close(); dcRef.current = null;
    pcRef.current?.close(); pcRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null;
    if (audioRef.current) audioRef.current.srcObject = null;
    setEnabled(false); setState('standby');
  };

  const executeTool = async (callId: string, command: string) => {
    if (HIGH_IMPACT.test(command) && pendingRef.current !== command) {
      pendingRef.current = command; pendingCallId.current = callId; setPending(command); setResponse('External-impact action detected. Confirm it on screen before I execute it.'); addLog('you', command); return;
    }
    try {
      setState('thinking'); setResponse('Executing through the Nexor command plane…'); addLog('you', command);
      const res = await fetch('/api/command', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: command, context: { source: 'realtime-voice', interface: 'jarvis-command-center', persona: 'jarvis' } }) });
      const data = await res.json() as { success?: boolean; error?: string; route?: { workflow?: string }; execution?: { error?: string } };
      const spoken = data.success ? `${(data.route?.workflow ?? 'Command').replaceAll('_', ' ')} completed.` : `I could not complete that command. ${data.error ?? data.execution?.error ?? 'The command failed.'}`;
      setResponse(spoken); addLog('nexor', spoken);
      sendEvent({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: callId, output: JSON.stringify({ success: Boolean(data.success), workflow: data.route?.workflow, error: data.error ?? data.execution?.error }) } });
      sendEvent({ type: 'response.create' }); setState('speaking');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Command service unavailable.';
      setResponse(message); setState('error');
      sendEvent({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: callId, output: JSON.stringify({ success: false, error: message }) } }); sendEvent({ type: 'response.create' });
    }
  };

  const start = async () => {
    if (enabled) return;
    try {
      setState('connecting'); setResponse('Opening secure realtime voice channel…');
      const pc = new RTCPeerConnection(); pcRef.current = pc;
      pc.ontrack = (event) => { if (!audioRef.current) return; audioRef.current.srcObject = event.streams[0]; audioRef.current.muted = mutedRef.current; void audioRef.current.play().catch(() => undefined); };
      pc.onconnectionstatechange = () => { if (pc.connectionState === 'connected') { setEnabled(true); setState('listening'); setResponse('Realtime link established. Speak naturally.'); } if (['failed', 'closed'].includes(pc.connectionState)) setState('error'); };
      const microphone = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      streamRef.current = microphone; microphone.getTracks().forEach((track) => pc.addTrack(track, microphone));
      const dc = pc.createDataChannel('oai-events'); dcRef.current = dc;
      dc.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as { type?: string; delta?: string; transcript?: string; item?: { name?: string; call_id?: string; arguments?: string } };
          if (message.type === 'input_audio_buffer.speech_started') { setState('listening'); setTranscript(''); }
          if (message.type === 'response.created') setState('thinking');
          if (message.type === 'response.audio_transcript.delta' && message.delta) setTranscript((value) => value + message.delta);
          if (message.type === 'response.audio_transcript.done' && message.transcript) { setResponse(message.transcript); addLog('nexor', message.transcript); setTranscript(''); setState('speaking'); }
          if (message.type === 'response.done') setState('listening');
          if (message.type === 'conversation.item.input_audio_transcription.completed' && message.transcript) { setTranscript(message.transcript); addLog('you', message.transcript); }
          if (message.type === 'response.function_call_arguments.done' && message.item?.name === 'nexor_command' && message.item.call_id) {
            let args: { command?: string } = {}; try { args = JSON.parse(message.item.arguments ?? '{}') as { command?: string }; } catch { /* invalid args */ }
            if (args.command) void executeTool(message.item.call_id, args.command);
          }
          if (message.type === 'error') { setState('error'); setResponse('Realtime voice reported an error.'); }
        } catch { /* ignore malformed events */ }
      };
      const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
      await new Promise<void>((resolve) => { if (pc.iceGatheringState === 'complete') return resolve(); const timer = window.setTimeout(resolve, 2500); pc.onicegatheringstatechange = () => { if (pc.iceGatheringState === 'complete') { window.clearTimeout(timer); resolve(); } }; });
      const form = new FormData(); form.append('sdp', pc.localDescription?.sdp ?? '');
      const answer = await fetch('/api/realtime/calls', { method: 'POST', body: form });
      if (!answer.ok) throw new Error(await answer.text() || 'Realtime session could not be created.');
      await pc.setRemoteDescription({ type: 'answer', sdp: await answer.text() });
    } catch (error) { stop(); setState('error'); setResponse(error instanceof Error ? error.message : 'Unable to start realtime voice.'); }
  };

  const confirm = () => {
    const command = pendingRef.current; const callId = pendingCallId.current;
    if (!command || !callId) return;
    pendingRef.current = null; pendingCallId.current = null; setPending(null); void executeTool(callId, command);
  };

  useEffect(() => { mutedRef.current = muted; if (audioRef.current) audioRef.current.muted = muted; }, [muted]);
  useEffect(() => () => stop(), []);

  const active = state !== 'standby' && state !== 'error';
  const label = state === 'connecting' ? 'CONNECTING' : state === 'thinking' ? 'THINKING' : state === 'speaking' ? 'SPEAKING' : state === 'listening' ? 'LISTENING' : state === 'error' ? 'ATTENTION' : 'STANDBY';

  const quick = (command: string) => { setTranscript(command); sendEvent({ type: 'conversation.item.create', item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: command }] } }); sendEvent({ type: 'response.create' }); };

  return (
    <aside className="fixed bottom-5 right-5 z-[100] w-[min(480px,calc(100vw-2rem))]">
      <audio ref={audioRef} autoPlay playsInline />
      <div className="overflow-hidden rounded-[30px] border border-[var(--border-strong)] bg-[var(--surface)]/96 shadow-[0_30px_120px_rgba(20,24,55,0.24)] backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <div className="flex items-center gap-3"><div className={`relative flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--accent)]/50 bg-[var(--accent-soft)] text-[var(--accent)] ${active ? 'animate-pulse' : ''}`}><span className="font-mono text-[11px] font-black">NX</span>{active && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[var(--success)] ring-2 ring-[var(--surface)]" />}</div><div><div className="text-[11px] font-black tracking-[0.14em]">NEXOR <span className="text-[var(--accent)]">JARVIS</span></div><div className="mt-1 font-mono text-[7px] tracking-[0.18em] text-[var(--text-muted)]">REALTIME VOICE · {label}</div></div></div>
          <div className="flex gap-1.5"><button onClick={() => setMuted((v) => !v)} className="rounded-lg border border-[var(--border)] px-2 py-1.5 font-mono text-[7px]">{muted ? 'MUTED' : 'VOICE'}</button><button onClick={active ? stop : start} className="rounded-lg bg-[var(--accent)] px-3 py-1.5 font-mono text-[7px] font-bold text-white">{active ? 'DISCONNECT' : 'ACTIVATE'}</button></div>
        </div>
        <div className="px-4 py-4">
          <div className="grid grid-cols-[84px_1fr] gap-3"><button onClick={active ? stop : start} className="relative flex h-[84px] w-[84px] items-center justify-center overflow-hidden rounded-[24px] border border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--accent)]"><span className={`absolute h-12 w-12 rounded-full border border-[var(--accent)]/30 ${active ? 'animate-ping' : ''}`} /><span className="relative font-mono text-xl">{state === 'thinking' ? '◌' : '◉'}</span></button><div className="min-w-0"><div className="font-mono text-[7px] tracking-[0.18em] text-[var(--text-muted)]">LIVE TRANSCRIPT</div><div className="mt-1 min-h-10 text-[11px] leading-5">{transcript || response}</div><div className="mt-2 font-mono text-[6px] tracking-[0.14em] text-[var(--text-muted)]">SEMANTIC VAD · INTERRUPTION · SPEECH-TO-SPEECH · TOOL CALLING</div></div></div>
          {pending && <div className="mt-3 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-3"><div className="font-mono text-[7px] tracking-[0.16em] text-amber-600">APPROVAL REQUIRED</div><div className="mt-1 text-[9px]">{pending}</div><div className="mt-2 flex gap-2"><button onClick={confirm} className="rounded-lg bg-[var(--accent)] px-3 py-2 text-[8px] font-bold text-white">CONFIRM</button><button onClick={() => { pendingRef.current = null; pendingCallId.current = null; setPending(null); }} className="rounded-lg border border-[var(--border)] px-3 py-2 text-[8px]">CANCEL</button></div></div>}
          <div className="mt-3 grid grid-cols-2 gap-2">{QUICK_COMMANDS.map((command) => <button key={command} onClick={() => quick(command)} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-2 py-2 text-left text-[8px] text-[var(--text-secondary)] hover:border-[var(--accent)]/40 hover:text-[var(--text)]">{command}</button>)}</div>
          {logs.length > 0 && <div className="mt-3 max-h-28 space-y-1.5 overflow-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-2.5">{logs.slice(-4).map((log) => <div key={log.id} className="flex gap-2 text-[8px]"><span className="w-10 shrink-0 font-mono text-[6px] text-[var(--text-muted)]">{log.role === 'you' ? 'YOU' : 'NX'} · {log.time}</span><span className="text-[var(--text-secondary)]">{log.text}</span></div>)}</div>}
        </div>
      </div>
    </aside>
  );
}
