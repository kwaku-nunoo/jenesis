/** Thin wrappers around the browser speech APIs, with graceful fallbacks. */

interface Recogniser {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

interface SpeechResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

type SpeechWindow = {
  SpeechRecognition?: new () => Recogniser;
  webkitSpeechRecognition?: new () => Recogniser;
};

function speechWindow(): SpeechWindow {
  return window as unknown as SpeechWindow;
}

export function speechSupported(): boolean {
  const w = speechWindow();
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function synthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function createRecognition(): Recogniser | null {
  const w = speechWindow();
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const recognition = new Ctor();
  recognition.lang = 'en-GB';
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  return recognition;
}

function preferredVoice(): SpeechSynthesisVoice | null {
  if (!synthesisSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  return (
    voices.find((voice) => /en-GB/i.test(voice.lang) && /female|serena|kate|sonia/i.test(voice.name)) ??
    voices.find((voice) => /en-GB/i.test(voice.lang)) ??
    voices.find((voice) => /^en/i.test(voice.lang)) ??
    voices[0]
  );
}

export function speak(text: string, enabled: boolean): void {
  if (!enabled || !synthesisSupported() || !text) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-GB';
  utterance.rate = 1;
  utterance.pitch = 1;
  const voice = preferredVoice();
  if (voice) utterance.voice = voice;
  synth.speak(utterance);
}

export function stopSpeaking(): void {
  if (synthesisSupported()) window.speechSynthesis.cancel();
}

export type { Recogniser, SpeechResultEvent };
