'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type SpeechRecognitionResultListLike = { [index: number]: { isFinal: boolean; [index: number]: { transcript: string } } } & { length: number };
type SpeechRecognitionEventLike = { resultIndex: number; results: SpeechRecognitionResultListLike };
type SpeechRecognitionErrorLike = { error?: string };
type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

type Props = { compact?: boolean };

const WAKE_WORD = /^(?:hey|hello|hlo|hi)\s+nexor\b[\s,.:!-]*/i;

function getRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const browser = window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition ?? null;
}

function pickPreferredVoice() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find((voice) => /en-GB/i.test(voice.lang) && /Daniel|George|Arthur|Ryan|Oliver/i.test(voice.name))
    ?? voices.find((voice) => /en-GB/i.test(voice.lang))
    ?? voices.find((voice) => /en/i.test(voice.lang));
  return preferred ?? null;
}

export default function VoiceAssistant({ compact = false }: Props) {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const activeRef = useRef(false);
  const busyRef = useRef(false);
  const [active, setActive] = useState(false);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Say “Hey Nexor” and give a command.');

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickPreferredVoice();
    if (voice) utterance.voice = voice;
    utterance.lang = 'en-GB';
    utterance.rate = 0.92;
    utterance.pitch = 0.82;
    utterance.volume = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, []);

  const runCommand = useCallback(async (command: string) => {
    const clean = command.trim();
    if (!clean || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setMessage(`Executing: ${clean}`);
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
      setMessage('Listening. What should I do?');
      speak('I am listening. What should I do?');
      return;
    }
    void runCommand(command);
  }, [runCommand, speak]);

  const startListening = useCallback(() => {
    const Constructor = getRecognitionConstructor();
    if (!Constructor) {
      setMessage('Speech recognition is not supported in this browser.');
      return;
    }
    if (!recognitionRef.current) {
      const recognition = new Constructor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';
      recognition.onresult = (event) => {
        let finalText = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          if (event.results[i].isFinal) finalText += `${event.results[i][0].transcript} `;
        }
        if (finalText) handleTranscript(finalText);
      };
      recognition.onerror = (event) => {
        if (event.error !== 'aborted' && event.error !== 'no-speech') setMessage(`Voice error: ${event.error || 'unknown'}`);
      };
      recognition.onend = () => {
        setListening(false);
        if (activeRef.current) {
          window.setTimeout(() => {
            if (!activeRef.current) return;
            try { recognition.start(); setListening(true); } catch { /* browser transition */ }
          }, 300);
        }
      };
      recognitionRef.current = recognition;
    }
    activeRef.current = true;
    setActive(true);
    setMessage('Nexor is online. Listening for “Hey Nexor”.');
    speak('Nexor is online.');
    try { recognitionRef.current.start(); setListening(true); } catch { setListening(true); }
  }, [handleTranscript, speak]);

  const stopListening = useCallback(() => {
    activeRef.current = false;
    setActive(false);
    setListening(false);
    recognitionRef.current?.stop();
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    setMessage('Voice control paused.');
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.onvoiceschanged = () => undefined;
    return () => {
      activeRef.current = false;
      recognitionRef.current?.stop();
      if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    };
  }, []);

  if (compact) {
    return <button type="button" onClick={active ? stopListening : startListening} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[9px] font-semibold text-[var(--text)] transition hover:border-[var(--accent)]" title="Voice command">{active ? '● NEXOR LISTENING' : '◉ VOICE NEXOR'}</button>;
  }

  return (
    <section className="nexor-panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4"><div><div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--text)]"><span className={active ? 'h-2 w-2 rounded-full bg-emerald-400 animate-pulse' : 'h-2 w-2 rounded-full bg-[var(--text-muted)]'} />Nexor Voice</div><div className="mt-1 text-[8px] text-[var(--text-muted)]">Wake word + command execution + spoken response</div></div><span className="font-mono text-[7px] tracking-[0.16em] text-[var(--text-muted)]">{busy ? 'EXECUTING' : listening ? 'LISTENING' : 'STANDBY'}</span></div>
      <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"><div className="min-w-0"><div className="text-[10px] font-semibold text-[var(--text)]">“Hey Nexor, show my hottest leads.”</div><div className="mt-1 text-[9px] leading-5 text-[var(--text-secondary)]">Voice commands are routed through the same /api/command execution path as the dashboard command surface.</div><div className="mt-2 font-mono text-[7px] text-[var(--text-muted)]">{message}</div></div><button type="button" onClick={active ? stopListening : startListening} className="shrink-0 rounded-xl bg-[var(--accent)] px-5 py-3 text-[9px] font-bold tracking-[0.12em] text-black transition hover:brightness-110">{active ? 'STOP VOICE' : 'ACTIVATE VOICE'}</button></div>
    </section>
  );
}
