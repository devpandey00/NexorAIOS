'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type VoiceState = 'idle' | 'armed' | 'listening' | 'thinking' | 'speaking' | 'error';
type SpeechRecognitionResultLike = { isFinal: boolean; 0: { transcript: string } };
type SpeechRecognitionEventLike = Event & { resultIndex: number; results: ArrayLike<SpeechRecognitionResultLike> };
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: Event) => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type WindowWithSpeech = Window & typeof globalThis & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

interface CommandResponse {
  success: boolean;
  route?: { workflow?: string; confidence?: number; reason?: string };
  execution?: { success?: boolean; results?: Record<string, unknown>; error?: string; executionTime?: number };
  error?: string;
}

type VoiceLog = { id: number; role: 'you' | 'nexor'; text: string; time: string; workflow?: string };

const WAKE_WORD = /\b(?:hey|hello|hlo|hi|okay|ok)\s+nexor\b/i;
const HIGH_IMPACT = /\b(?:delete|remove|erase|wipe|send|publish|post|approve|reject|pay|charge|transfer|shutdown|disable|disconnect|launch campaign|message all|broadcast)\b/i;
const QUICK_COMMANDS = ['Show today’s priorities', 'Find my hottest leads', 'Run the sales machine', 'Give me a growth briefing'];

function cleanCommand(text: string) {
  return text.replace(WAKE_WORD, '').replace(/^[,.:;\s]+/, '').trim();
}

function humanWorkflow(workflow?: string) {
  return (workflow ?? 'command').replaceAll('_', ' ');
}

function buildSpokenResponse(data: CommandResponse) {
  if (!data.success) return `I couldn't complete that command. ${data.error ?? 'The command failed.'}`;
  const workflow = humanWorkflow(data.route?.workflow);
  const execution = data.execution;
  if (execution?.success === false) return `${workflow} started but failed. ${execution.error ?? 'No further details were returned.'}`;
  const resultCount = execution?.results ? Object.keys(execution.results).length : 0;
  const seconds = execution?.executionTime ? Math.max(1, Math.round(execution.executionTime / 1000)) : 0;
  return seconds
    ? `${workflow} completed. I ran ${resultCount} operation${resultCount === 1 ? '' : 's'} in ${seconds} seconds.`
    : `${workflow} completed. ${resultCount} operation${resultCount === 1 ? '' : 's'} finished.`;
}

export default function NexorVoiceAssistant() {
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [commandInput, setCommandInput] = useState('');
  const [lastResponse, setLastResponse] = useState('Voice command center standing by.');
  const [supported, setSupported] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [muted, setMuted] = useState(false);
  const [logs, setLogs] = useState<VoiceLog[]>([]);
  const [pendingCommand, setPendingCommand] = useState<string | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const enabledRef = useRef(false);
  const armedRef = useRef(false);
  const speakingRef = useRef(false);
  const processingRef = useRef(false);
  const mutedRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logIdRef = useRef(0);

  const pushLog = useCallback((role: VoiceLog['role'], text: string, workflow?: string) => {
    setLogs((current) => [...current.slice(-7), {
      id: ++logIdRef.current,
      role,
      text,
      workflow,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }]);
  }, []);

  const speak = useCallback((text: string, after?: () => void) => {
    if (mutedRef.current || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      after?.();
      return;
    }
    speakingRef.current = true;
    setState('speaking');
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 0.86;
    utterance.volume = 1;
    utterance.lang = 'en-IN';
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find((voice) => /en-IN/i.test(voice.lang))
      ?? voices.find((voice) => /en-US|en-GB/i.test(voice.lang));
    if (preferred) utterance.voice = preferred;
    utterance.onend = () => {
      speakingRef.current = false;
      after?.();
      if (enabledRef.current && !processingRef.current) {
        setState(armedRef.current ? 'listening' : 'idle');
        restartRecognition();
      }
    };
    utterance.onerror = () => {
      speakingRef.current = false;
      after?.();
      if (enabledRef.current && !processingRef.current) restartRecognition();
    };
    window.speechSynthesis.speak(utterance);
  }, []);

  const startRecognition = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition || !enabledRef.current || speakingRef.current || processingRef.current) return;
    try { recognition.start(); } catch { /* already listening */ }
  }, []);

  const restartRecognition = useCallback(() => {
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    restartTimerRef.current = setTimeout(startRecognition, 250);
  }, [startRecognition]);

  const executeCommand = useCallback(async (command: string) => {
    const query = command.trim();
    if (!query || processingRef.current) return;
    if (HIGH_IMPACT.test(query) && pendingCommand !== query) {
      setPendingCommand(query);
      setLastResponse('This can change external systems or send content. Confirm below to continue.');
      setState('armed');
      speak('This action can make an external change. Please confirm it on screen.');
      return;
    }

    setPendingCommand(null);
    processingRef.current = true;
    armedRef.current = false;
    setState('thinking');
    setTranscript(query);
    setLastResponse('Thinking, routing, and executing…');
    pushLog('you', query);
    recognitionRef.current?.stop();

    try {
      const response = await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          context: {
            source: 'voice',
            wakeWord: 'nexor',
            interface: 'jarvis-command-center',
            persona: 'jarvis',
            responseStyle: 'concise, decisive, operational',
          },
        }),
      });
      const data = (await response.json()) as CommandResponse;
      const spoken = buildSpokenResponse(data);
      setLastResponse(spoken);
      pushLog('nexor', spoken, data.route?.workflow);
      if (!response.ok || !data.success) {
        setState('error');
        speak(spoken, () => { processingRef.current = false; armedRef.current = true; });
        return;
      }
      speak(spoken, () => { processingRef.current = false; armedRef.current = true; });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network error.';
      const spoken = `I couldn't reach the Nexor command service. ${message}`;
      setLastResponse(spoken);
      pushLog('nexor', spoken);
      setState('error');
      speak(spoken, () => { processingRef.current = false; armedRef.current = true; });
    }
  }, [pendingCommand, pushLog, speak]);

  useEffect(() => {
    mutedRef.current = muted;
    if (muted && typeof window !== 'undefined') window.speechSynthesis?.cancel();
  }, [muted]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const speechWindow = window as WindowWithSpeech;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) { setSupported(false); return; }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';
    recognition.onstart = () => {
      if (!speakingRef.current && !processingRef.current) setState(armedRef.current ? 'listening' : 'idle');
    };
    recognition.onresult = (event) => {
      let interim = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result[0]?.transcript?.trim() ?? '';
        if (!text) continue;
        if (!result.isFinal) { interim += `${text} `; continue; }
        setTranscript(text);
        if (processingRef.current || speakingRef.current) continue;
        if (!armedRef.current) {
          if (!WAKE_WORD.test(text)) continue;
          const command = cleanCommand(text);
          armedRef.current = true;
          if (command) void executeCommand(command);
          else {
            setState('armed');
            setLastResponse('Yes. What should I do?');
            recognition.stop();
            speak('Yes. What should I do?', () => { if (!processingRef.current) restartRecognition(); });
          }
        } else {
          void executeCommand(text);
        }
      }
      if (interim) setTranscript(interim.trim());
    };
    recognition.onerror = (event) => {
      const error = event as Event & { error?: string };
      if (error.error === 'not-allowed' || error.error === 'service-not-allowed') {
        setState('error');
        setLastResponse('Microphone permission is blocked. Allow microphone access for Nexor.');
        enabledRef.current = false;
        setEnabled(false);
        return;
      }
      if (enabledRef.current && !speakingRef.current && !processingRef.current) restartRecognition();
    };
    recognition.onend = () => {
      if (enabledRef.current && !speakingRef.current && !processingRef.current) restartRecognition();
    };
    recognitionRef.current = recognition;
    return () => {
      enabledRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      recognition.stop();
      window.speechSynthesis?.cancel();
    };
  }, [executeCommand, restartRecognition, speak]);

  const toggleListening = () => {
    if (!supported) return;
    if (enabledRef.current) {
      enabledRef.current = false;
      armedRef.current = false;
      recognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
      speakingRef.current = false;
      setEnabled(false);
      setState('idle');
      setLastResponse('Voice command center paused.');
      return;
    }
    enabledRef.current = true;
    armedRef.current = false;
    setEnabled(true);
    setSessionStarted(true);
    setState('idle');
    setLastResponse('Listening for “Hey Nexor”…');
    startRecognition();
  };

  const submitText = async () => {
    const command = commandInput.trim();
    if (!command) return;
    setCommandInput('');
    await executeCommand(command);
  };

  const confirmPending = () => {
    if (pendingCommand) void executeCommand(pendingCommand);
  };

  const stateLabel = !supported ? 'VOICE UNSUPPORTED' : state === 'armed' ? 'READY' : state === 'listening' ? 'LISTENING' : state === 'thinking' ? 'EXECUTING' : state === 'speaking' ? 'SPEAKING' : state === 'error' ? 'ATTENTION' : 'STANDBY';
  const orbMode = state === 'thinking' ? 'animate-spin' : state === 'speaking' ? 'animate-pulse' : enabled ? 'animate-pulse' : '';
  const confidence = useMemo(() => state === 'thinking' ? 'ROUTING' : enabled ? (armedRef.current ? 'READY' : 'WAKE WORD') : 'OFFLINE', [enabled, state]);

  return (
    <aside className="fixed bottom-5 right-5 z-[100] w-[min(460px,calc(100vw-2rem))]">
      <div className="overflow-hidden rounded-[28px] border border-[var(--border-strong)] bg-[var(--surface)]/96 shadow-[0_30px_100px_rgba(20,24,55,0.22)] backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <div className="flex items-center gap-3">
            <div className={`relative flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--accent)] ${orbMode}`}>
              <span className="font-mono text-[11px] font-black">NX</span>
              {enabled && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[var(--success)] ring-2 ring-[var(--surface)]" />}
            </div>
            <div>
              <div className="flex items-center gap-2 text-[11px] font-black tracking-[0.12em] text-[var(--text)]">NEXOR <span className="text-[var(--accent)]">JARVIS</span></div>
              <div className="mt-0.5 font-mono text-[7px] tracking-[0.18em] text-[var(--text-muted)]">{stateLabel} · {confidence} · SESSION {sessionStarted ? 'ACTIVE' : 'READY'}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setMuted((value) => !value)} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5 font-mono text-[7px] tracking-[0.1em] text-[var(--text-muted)] hover:text-[var(--text)]" title={muted ? 'Unmute voice' : 'Mute voice'}>{muted ? 'MUTED' : 'VOICE'}</button>
            <button onClick={toggleListening} className={`rounded-lg px-3 py-1.5 font-mono text-[7px] font-bold tracking-[0.12em] transition ${enabled ? 'bg-[var(--accent)] text-white' : 'border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:border-[var(--accent)]/50'}`}>{enabled ? 'ONLINE' : 'ACTIVATE'}</button>
          </div>
        </div>

        <div className="px-4 pb-4 pt-4">
          <div className="grid grid-cols-[76px_1fr] gap-3">
            <button onClick={toggleListening} aria-label={enabled ? 'Stop Nexor voice' : 'Start Nexor voice'} className={`relative flex h-[76px] w-[76px] items-center justify-center overflow-hidden rounded-[22px] border ${enabled ? 'border-[var(--accent)]/60 bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)]'}`}>
              <span className={`absolute h-12 w-12 rounded-full border border-[var(--accent)]/30 ${orbMode}`} />
              <span className="relative text-xl">{state === 'speaking' ? '◒' : state === 'thinking' ? '◌' : enabled ? '◉' : '◌'}</span>
            </button>
            <div className="min-w-0">
              <div className="font-mono text-[7px] font-semibold tracking-[0.18em] text-[var(--text-muted)]">LIVE TRANSCRIPT</div>
              <div className="mt-1 min-h-[38px] text-[11px] leading-5 text-[var(--text)]">{transcript || 'Say “Hey Nexor” followed by an instruction.'}</div>
              <div className="mt-2 flex gap-2 font-mono text-[6px] tracking-[0.12em] text-[var(--text-muted)]"><span>STT</span><span>•</span><span>TTS</span><span>•</span><span>MEMORY</span><span>•</span><span>TOOLS</span></div>
            </div>
          </div>

          {pendingCommand && (
            <div className="mt-3 rounded-2xl border border-[var(--warning)]/40 bg-[var(--warning-soft)] p-3">
              <div className="font-mono text-[7px] font-bold tracking-[0.16em] text-[var(--warning)]">CONFIRM EXTERNAL ACTION</div>
              <div className="mt-1 text-[9px] leading-4 text-[var(--text)]">{pendingCommand}</div>
              <div className="mt-2 flex gap-2">
                <button onClick={confirmPending} className="rounded-lg bg-[var(--text)] px-3 py-1.5 text-[8px] font-bold text-[var(--bg)]">CONFIRM & RUN</button>
                <button onClick={() => setPendingCommand(null)} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[8px] text-[var(--text-secondary)]">CANCEL</button>
              </div>
            </div>
          )}

          <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5">
            <div className="flex items-center justify-between font-mono text-[7px] tracking-[0.16em] text-[var(--text-muted)]"><span>NEXOR RESPONSE</span><span>{stateLabel}</span></div>
            <div className="mt-1 text-[9px] leading-4 text-[var(--text-secondary)]">{lastResponse}</div>
          </div>

          <div className="mt-3 flex gap-2">
            <input value={commandInput} onChange={(event) => setCommandInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void submitText(); }} placeholder="Type any command…" className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-[9px] text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]/50" />
            <button onClick={() => void submitText()} className="rounded-xl bg-[var(--text)] px-3.5 py-2 text-[8px] font-bold text-[var(--bg)]">RUN</button>
          </div>

          <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
            {QUICK_COMMANDS.map((command) => <button key={command} onClick={() => void executeCommand(command)} className="shrink-0 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-[7px] text-[var(--text-secondary)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)]">{command}</button>)}
          </div>

          {logs.length > 0 && (
            <div className="mt-3 max-h-32 space-y-1 overflow-y-auto border-t border-[var(--border)] pt-2">
              {logs.slice(-4).map((log) => <div key={log.id} className="flex gap-2 text-[8px] leading-4"><span className="w-8 shrink-0 font-mono text-[6px] uppercase text-[var(--text-muted)]">{log.role}</span><span className="min-w-0 flex-1 text-[var(--text-secondary)]">{log.text}</span><span className="font-mono text-[6px] text-[var(--text-muted)]">{log.time}</span></div>)}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between font-mono text-[6px] tracking-[0.12em] text-[var(--text-muted)]"><span>WAKE · HEY NEXOR</span><span>JARVIS MODE · COMMAND ROUTER</span></div>
        </div>
      </div>
    </aside>
  );
}
