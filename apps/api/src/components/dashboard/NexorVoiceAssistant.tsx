'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type VoiceState = 'idle' | 'armed' | 'listening' | 'thinking' | 'speaking' | 'error';

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRecognitionEventLike = Event & {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};

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
  execution?: {
    success?: boolean;
    results?: Record<string, unknown>;
    error?: string;
    executionTime?: number;
  };
  error?: string;
}

const WAKE_WORD = /\b(?:hey|hello|hlo|hi)\s+nexor\b/i;

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
  if (execution?.success === false) {
    return `${workflow} started but failed. ${execution.error ?? 'No further details were returned.'}`;
  }

  const resultCount = execution?.results ? Object.keys(execution.results).length : 0;
  const seconds = execution?.executionTime ? Math.max(1, Math.round(execution.executionTime / 1000)) : 0;
  return seconds
    ? `${workflow} completed successfully. I ran ${resultCount} operation${resultCount === 1 ? '' : 's'} in ${seconds} seconds.`
    : `${workflow} completed successfully. ${resultCount} operation${resultCount === 1 ? '' : 's'} finished.`;
}

export default function NexorVoiceAssistant() {
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [commandInput, setCommandInput] = useState('');
  const [lastResponse, setLastResponse] = useState('Say “Hey Nexor” to activate me.');
  const [supported, setSupported] = useState(true);
  const [enabled, setEnabled] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const enabledRef = useRef(false);
  const armedRef = useRef(false);
  const speakingRef = useRef(false);
  const processingRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const speak = useCallback((text: string, after?: () => void) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      after?.();
      return;
    }

    speakingRef.current = true;
    setState('speaking');
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.98;
    utterance.pitch = 0.92;
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
    try {
      recognition.start();
    } catch {
      // Browser throws if start() is called while already listening.
    }
  }, []);

  const restartRecognition = useCallback(() => {
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    restartTimerRef.current = setTimeout(startRecognition, 250);
  }, [startRecognition]);

  const executeCommand = useCallback(async (command: string) => {
    const query = command.trim();
    if (!query || processingRef.current) return;

    processingRef.current = true;
    armedRef.current = false;
    setState('thinking');
    setTranscript(query);
    setLastResponse('Executing through the Nexor command router…');
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
            interface: 'dashboard',
          },
        }),
      });
      const data = (await response.json()) as CommandResponse;
      const spoken = buildSpokenResponse(data);
      setLastResponse(spoken);
      if (!response.ok || !data.success) {
        setState('error');
        speak(spoken, () => {
          processingRef.current = false;
          armedRef.current = true;
        });
        return;
      }
      speak(spoken, () => {
        processingRef.current = false;
        armedRef.current = true;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network error.';
      const spoken = `I couldn't reach the Nexor command service. ${message}`;
      setLastResponse(spoken);
      setState('error');
      speak(spoken, () => {
        processingRef.current = false;
        armedRef.current = true;
      });
    }
  }, [speak]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const speechWindow = window as WindowWithSpeech;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setSupported(false);
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    recognition.onstart = () => {
      if (!speakingRef.current && !processingRef.current) {
        setState(armedRef.current ? 'listening' : 'idle');
      }
    };

    recognition.onresult = (event) => {
      let interim = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result[0]?.transcript?.trim() ?? '';
        if (!text) continue;

        if (!result.isFinal) {
          interim += `${text} `;
          continue;
        }

        setTranscript(text);

        if (processingRef.current || speakingRef.current) continue;

        if (!armedRef.current) {
          if (!WAKE_WORD.test(text)) continue;

          const command = cleanCommand(text);
          armedRef.current = true;

          if (command) {
            void executeCommand(command);
          } else {
            setState('armed');
            setLastResponse('Listening. What should I do?');
            recognition.stop();
            speak('Yes. What should I do?', () => {
              if (!processingRef.current) restartRecognition();
            });
          }
          continue;
        }

        void executeCommand(text);
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
      setLastResponse('Voice control paused.');
      return;
    }

    enabledRef.current = true;
    armedRef.current = false;
    setEnabled(true);
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

  const stateLabel = !supported
    ? 'VOICE UNSUPPORTED'
    : state === 'armed'
      ? 'READY FOR COMMAND'
      : state === 'listening'
        ? 'LISTENING'
        : state === 'thinking'
          ? 'EXECUTING'
          : state === 'speaking'
            ? 'SPEAKING'
            : state === 'error'
              ? 'ATTENTION'
              : 'STANDBY';

  return (
    <aside className="fixed bottom-5 right-5 z-[100] w-[min(420px,calc(100vw-2rem))]">
      <div className="overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[var(--surface)]/95 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <div className="flex items-center gap-3">
            <div className={`relative flex h-9 w-9 items-center justify-center rounded-full border text-[11px] font-bold ${enabled ? 'border-[var(--accent)]/60 bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)]'}`}>
              N
              {enabled && <span className="absolute inset-0 animate-ping rounded-full border border-[var(--accent)]/30" />}
            </div>
            <div>
              <div className="text-[10px] font-semibold tracking-[0.08em] text-[var(--text)]">NEXOR VOICE</div>
              <div className="mt-0.5 font-mono text-[7px] tracking-[0.14em] text-[var(--text-muted)]">{stateLabel}</div>
            </div>
          </div>
          <button onClick={toggleListening} className={`rounded-full px-3 py-1.5 font-mono text-[7px] font-semibold tracking-[0.12em] transition ${enabled ? 'bg-[var(--accent)] text-black' : 'border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)]'}`}>
            {enabled ? 'VOICE ON' : 'ACTIVATE'}
          </button>
        </div>

        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={toggleListening} aria-label={enabled ? 'Stop Nexor voice' : 'Start Nexor voice'} className={`relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border transition ${enabled ? 'border-[var(--accent)]/50 bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:border-[var(--accent)]/40 hover:text-[var(--accent)]'}`}>
              <span className="text-xl">{enabled ? '◉' : '◌'}</span>
              {state === 'thinking' && <span className="absolute inset-2 animate-spin rounded-xl border border-transparent border-t-[var(--accent)]" />}
            </button>
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[7px] tracking-[0.16em] text-[var(--text-muted)]">TRANSCRIPT</div>
              <div className="mt-1 min-h-8 text-[11px] leading-5 text-[var(--text)]">{transcript || 'Waiting for your voice…'}</div>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5">
            <div className="font-mono text-[7px] tracking-[0.16em] text-[var(--text-muted)]">NEXOR RESPONSE</div>
            <div className="mt-1 text-[9px] leading-4 text-[var(--text-secondary)]">{lastResponse}</div>
          </div>

          <div className="mt-3 flex gap-2">
            <input value={commandInput} onChange={(event) => setCommandInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void submitText(); }} placeholder="Type a command if needed…" className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[9px] text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]/40" />
            <button onClick={() => void submitText()} className="rounded-xl bg-[var(--text)] px-3 py-2 text-[8px] font-semibold text-[var(--bg)] transition hover:opacity-85">RUN</button>
          </div>

          <div className="mt-3 flex items-center justify-between font-mono text-[6px] tracking-[0.12em] text-[var(--text-muted)]">
            <span>WAKE WORD · HEY / HELLO / HLO NEXOR</span>
            <span>STT · TTS · COMMAND ROUTER</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
