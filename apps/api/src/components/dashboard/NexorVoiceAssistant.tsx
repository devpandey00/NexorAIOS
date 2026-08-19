'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const WAKE_WORD = /^(?:hey\s+)?nexor[\s,.:;-]*/i;

function cleanCommand(transcript: string) {
  return transcript.trim().replace(WAKE_WORD, '').trim();
}

function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.02;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

export default function NexorVoiceAssistant() {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const activeRef = useRef(false);
  const processingRef = useRef(false);
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastResponse, setLastResponse] = useState('');

  const execute = useCallback(async (command: string) => {
    if (!command || processingRef.current) return;
    processingRef.current = true;
    setProcessing(true);
    setTranscript(command);

    try {
      const response = await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: command, source: 'voice' }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Command failed');
      }

      const route = typeof data.route === 'string' ? data.route : 'command';
      const message = `Done. ${route.replaceAll('_', ' ')} completed.`;
      setLastResponse(message);
      speak(message);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'I could not complete that command.';
      setLastResponse(message);
      speak(`I could not complete that. ${message}`);
    } finally {
      processingRef.current = false;
      setProcessing(false);
    }
  }, []);

  const startListening = useCallback(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;

    recognitionRef.current?.abort();
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-IN';

    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      const text = last?.[0]?.transcript?.trim() || '';
      if (!text) return;

      const command = cleanCommand(text);
      setTranscript(text);

      if (!command && /\bnexor\b/i.test(text)) {
        speak('I am listening. What should I do?');
        return;
      }

      if (command) void execute(command);
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        activeRef.current = false;
        setListening(false);
        setLastResponse('Microphone permission is required.');
      }
    };

    recognition.onend = () => {
      if (!activeRef.current) {
        setListening(false);
        return;
      }

      window.setTimeout(() => {
        if (!activeRef.current || processingRef.current) return;
        try {
          recognition.start();
          setListening(true);
        } catch {
          // Browser may already be restarting recognition.
        }
      }, 250);
    };

    recognitionRef.current = recognition;
    activeRef.current = true;
    setListening(true);
    speak('Nexor is listening.');
    recognition.start();
  }, [execute]);

  const stopListening = useCallback(() => {
    activeRef.current = false;
    recognitionRef.current?.stop();
    setListening(false);
    speak('Voice control paused.');
  }, []);

  useEffect(() => {
    setSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
    return () => {
      activeRef.current = false;
      recognitionRef.current?.abort();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  if (!supported) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[80] flex flex-col items-end gap-2">
      {(transcript || lastResponse) && (
        <div className="max-w-[320px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-2xl backdrop-blur-xl">
          {transcript && (
            <div className="text-[10px] text-[var(--text-secondary)]">
              <span className="mr-1 font-mono text-[8px] text-[var(--text-muted)]">HEARD</span>
              {transcript}
            </div>
          )}
          {lastResponse && (
            <div className="mt-1.5 text-[10px] font-medium text-[var(--text)]">{lastResponse}</div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={listening ? stopListening : startListening}
        disabled={processing}
        aria-label={listening ? 'Stop Nexor voice control' : 'Start Nexor voice control'}
        className="flex items-center gap-2 rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 text-[10px] font-bold tracking-[0.12em] text-[var(--text)] shadow-2xl backdrop-blur-xl transition hover:scale-[1.02] disabled:opacity-60"
      >
        <span className={`h-2.5 w-2.5 rounded-full ${listening ? 'animate-pulse bg-emerald-400' : 'bg-[var(--accent)]'}`} />
        {processing ? 'EXECUTING…' : listening ? 'NEXOR LISTENING' : 'NEXOR VOICE'}
      </button>
    </div>
  );
}
