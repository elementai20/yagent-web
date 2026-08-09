'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { apiUrl } from './api';

/**
 * Push-to-talk speech-to-text with two engines:
 *   1. Web Speech API (free, in-browser) when available — primary.
 *   2. MediaRecorder → POST /api/transcribe (server Whisper) — fallback for
 *      browsers without Web Speech (e.g. Firefox).
 * Emits the running text via `onText`; the caller fills the input box
 * (review then send). Recognition runs until the user clicks stop.
 */

// Minimal typing for the non-standard Web Speech API.
interface SRResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface SREvent {
  resultIndex: number;
  results: ArrayLike<SRResult>;
}
type SpeechRecognitionCtor = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useSpeech(onText: (text: string) => void) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false); // transcribing (server path)
  const [error, setError] = useState('');

  const SR = useMemo(() => getSpeechRecognition(), []);
  const supported = useMemo(
    () =>
      typeof window !== 'undefined' &&
      (!!getSpeechRecognition() || !!navigator.mediaDevices?.getUserMedia),
    [],
  );

  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const finalTranscriptRef = useRef('');

  // Keep the latest onText without re-creating callbacks.
  const onTextRef = useRef(onText);
  onTextRef.current = onText;

  const startWebSpeech = useCallback(() => {
    const rec = new SR!();
    recognitionRef.current = rec;
    rec.lang = 'en-US';
    rec.continuous = true; // keep listening until the user clicks stop
    rec.interimResults = true; // live feedback while speaking
    finalTranscriptRef.current = '';

    rec.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalTranscriptRef.current += r[0].transcript;
        else interim += r[0].transcript;
      }
      onTextRef.current((finalTranscriptRef.current + interim).trim());
    };
    rec.onerror = (e) => {
      // no-speech/aborted are benign (silence or user stop); surface the rest.
      if (e.error !== 'no-speech' && e.error !== 'aborted') setError(`speech error: ${e.error}`);
    };
    rec.onend = () => {
      setRecording(false);
      recognitionRef.current = null;
    };

    rec.start();
    setRecording(true);
  }, [SR]);

  const startRecorder = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = async () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      setBusy(true);
      try {
        const res = await fetch(apiUrl('/api/transcribe'), {
          method: 'POST',
          headers: { 'content-type': blob.type },
          body: blob,
        });
        const data = (await res.json()) as { text?: string; error?: string };
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        if (data.text) onTextRef.current(data.text.trim());
      } catch (err) {
        setError(
          err instanceof Error && /not configured/.test(err.message)
            ? 'Server transcription not configured (set VOICE_API_KEY).'
            : `transcription failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      } finally {
        setBusy(false);
      }
    };
    recorder.start();
    setRecording(true);
  }, []);

  const start = useCallback(async () => {
    setError('');
    try {
      if (SR) startWebSpeech();
      else await startRecorder();
    } catch (err) {
      setRecording(false);
      setError(
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Microphone permission denied.'
          : `could not start mic: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }, [SR, startWebSpeech, startRecorder]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop(); // flushes a final result, then fires onend
    } else if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop(); // triggers onstop → transcription
      recorderRef.current = null;
    }
    setRecording(false);
  }, []);

  const toggle = useCallback(() => {
    if (recording) stop();
    else void start();
  }, [recording, start, stop]);

  return { recording, busy, error, supported, toggle, start, stop };
}
