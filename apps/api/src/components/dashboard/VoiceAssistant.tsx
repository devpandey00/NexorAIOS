'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: any) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type Props = {
  compact?: boolean;
};

const WAKE_WORD = /^(?:hey|hello|hlo|hi)\s+nexor\b[\s,.:!-]*/i;

function getRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const browser = window as any;
  return (browser.SpeechRecognition || browser.webkitSpeechRecognition) ?? null;
}

export default function VoiceAssistant({ compact = false }: Props) {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const activeRef = useRef(false);
  const busyRef = useRef(false);
  const [active, setActive] = useState(false);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Say “Hlo Nexor, let’s start.”');

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.02;
    utterance.pitch = 0.95;
    window.speechSynthesis.speak(utterance);
  }, []);

  const runCommand = useCallback(async (command: string) => {
    const clean = command.trim();
    if (!clean || busyRef.current) return;

    busyRef.current = true;
    setBusy(true);
    setMessage(`Executing: ${clean}`);
    speak(`On it. ${clean}`);

    try {
      const response = await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: clean, context: { source: 'voice', wakeWord: 'Nexor' } }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Command failed');

      const execution = data.execution ?? {};
      const result = execution.result ?? execution;
      const summary = typeof result?.message === 'string'
        ? result.message
        : data.route?.workflow === 'sales_machine'
          ? 'Sales machine completed.'
          : `${data.route?.workflow ?? 'Nexor'} completed.`;

      setMessage(summary);
      speak(summary);
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Command failed';
      setMessage(`Failed: ${text}`);
      speak(`I could not complete that command. ${text}`);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [speak]);

  const handleTranscript = useCallback((transcript: string) => {
    const text = transcript.trim();
    const wake = text.match(WAKE_WORD);
    if (!wake) return;

    const command = text.slice(wake[0].length).trim();
    if (!command) {
      setMessage('I’m listening. What should I do?');
      speak('I’m listening. What should I do?');
      return;
    }

    void runCommand(command);
  }, [runCommand, speak]);

  const startListening = useCallback(() => {
    const Constructor = getRecognitionConstructor();
    if (!Constructor) {
      setMessage('Voice recognition is not supported in this browser.');
      return;
    }

    if (!recognitionRef.current) {
      const recognition = new Constructor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';
      recognition.onresult = (event: any) => {
        let finalText = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          if (event.results[i].isFinal) finalText += `${event.results[i][0].transcript} `;
        }
        if (finalText) handleTranscript(finalText);
      };
      recognition.onerror = (event: any) => {
        if (event?.error !== 'aborted' && event?.error !== 'no-speech') {
          setMessage(`Voice error: ${event.error || 'unknown'}`);
        }
      };
      recognition.onend = () => {
        setListening(false);
        if (activeRef.current) {
          window.setTimeout(() => {
            if (!activeRef.current) return;
            try {
              recognition.start();
              setListening(true);
            } catch {
              // Browser may reject a restart while transitioning state.
            }
          }, 250);
        }
      };
      recognitionRef.current = recognition;
    }

    activeRef.current = true;
    setActive(true);
    setMessage('Nexor is listening for “Hlo Nexor”.');
    speak('Nexor is online. Say Hlo Nexor, then your command.');
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch {
      setListening(true);
    }
  }, [handleTranscript, speak]);

  const stopListening = useCallback(() => {
    activeRef.current = false;
    setActive(false);
    setListening(false);
    recognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
    setMessage('Voice control paused.');
  }, []);

  useEffect(() => () => {
    activeRef.current = false;
    recognitionRef.current?.stop();
  }, []);

  if (compact) {
    return (
      <button
        type="button"
        onClick={active ? stopListening : startListening}
        className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[9px] font-semibold text-[var(--text)] transition hover:border-[var(--accent)]"
        title="Voice command"
      >
        {active ? '● NEXOR LISTENING' : '◉ VOICE NEXOR'}
      </button>
    );
  }

  return (
    <section className="nexor-panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--text)]">
            <span className={active ? 'h-2 w-2 rounded-full bg-emerald-400 animate-pulse' : 'h-2 w-2 rounded-full bg-[var(--text-muted)]'} />
            Voice Nexor
          </div>
          <div className="mt-1 text-[8px] text-[var(--text-muted)]">Wake word + natural-language command execution</div>
        </div>
        <span className="font-mono text-[7px] tracking-[0.16em] text-[var(--text-muted)]">{busy ? 'EXECUTING' : listening ? 'LISTENING' : 'STANDBY'}</span>
      </div>

      <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold text-[var(--text)]">“Hlo Nexor, let’s start.”</div>
          <div className="mt-1 text-[9px] leading-5 text-[var(--text-secondary)]">Then give any supported command: find leads, research a market, create content, audit a website, run the sales machine, or manage outreach.</div>
          <div className="mt-2 font-mono text-[7px] text-[var(--text-muted)]">{message}</div>
        </div>
        <button
          type="button"
          onClick={active ? stopListening : startListening}
          disabled={busy && !active}
          className="shrink-0 rounded-xl bg-[var(--accent)] px-5 py-3 text-[9px] font-bold tracking-[0.12em] text-black transition hover:brightness-110 disabled:opacity-40"
        >
          {active ? 'STOP VOICE' : 'ACTIVATE VOICE'}
        </button>
      </div>
    </section>
  );
}
