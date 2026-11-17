import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { clearMessages, pushMessage, saveSettings, useStore } from '../lib/store';
import { handle } from '../lib/assistant';
import { createRecognition, speak, speechSupported, stopSpeaking, type Recogniser } from '../lib/speech';
import { fmtTime } from '../lib/when';

const SUGGESTIONS = [
  'What’s on my schedule today?',
  'Remind me to call Dad at 6pm',
  'Add task finish the Arduino sketch tomorrow',
  'Remember that I decided to study at the library',
];

export function Assistant() {
  const state = useStore();
  const [listening, setListening] = useState(false);
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const recognitionRef = useRef<Recogniser | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [state.messages.length, listening]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      stopSpeaking();
    };
  }, []);

  function send(value: string) {
    const input = value.trim();
    if (!input) return;
    pushMessage('user', input);
    const result = handle(input);
    pushMessage('jenesis', result.reply);
    speak(result.reply, state.settings.speech);
    setDraft('');
    setNotice(null);
  }

  function toggleMic() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    if (!speechSupported()) {
      setNotice('This browser can’t listen. Try Chrome on Android or Safari on iPhone — or type below.');
      return;
    }
    const recognition = createRecognition();
    if (!recognition) {
      setNotice('Voice input is unavailable here. Type your request instead.');
      return;
    }
    recognitionRef.current = recognition;
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? '';
      setListening(false);
      if (transcript.trim()) send(transcript);
      else setNotice('I didn’t hear anything. Try again?');
    };
    recognition.onerror = (event) => {
      setListening(false);
      const code = event?.error ?? '';
      setNotice(
        code === 'not-allowed' || code === 'service-not-allowed'
          ? 'Microphone permission was blocked. Allow it in your browser settings, or type instead.'
          : 'I couldn’t catch that. Try again, or type it.'
      );
    };
    recognition.onend = () => setListening(false);

    try {
      recognition.start();
      setListening(true);
      setNotice(null);
    } catch {
      setListening(false);
      setNotice('Voice input failed to start. Type your request instead.');
    }
  }

  const messages = state.messages;

  return (
    <div className="assistant">
      <div className="chat" aria-live="polite">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p className="eyebrow">Jenesis</p>
            <h2 className="display display--sm">What do you need?</h2>
            <p className="muted">
              Tap the microphone and speak, or type. I add tasks, set reminders, keep notes and read back your day.
            </p>
            <ul className="chips">
              {SUGGESTIONS.map((suggestion) => (
                <li key={suggestion}>
                  <button type="button" className="chip" onClick={() => send(suggestion)}>
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className={`bubble bubble--${message.role}`}>
            <p>{message.text}</p>
            <span className="bubble-time">{fmtTime(message.createdAt)}</span>
          </div>
        ))}

        {listening && (
          <div className="bubble bubble--jenesis bubble--listening">
            <span className="pulse" aria-hidden="true" />
            <p>Listening…</p>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {notice && (
        <p className="banner banner--info" role="status">
          {notice}
        </p>
      )}

      <div className="composer">
        <button
          type="button"
          className={`mic${listening ? ' is-listening' : ''}`}
          onClick={toggleMic}
          aria-label={listening ? 'Stop listening' : 'Speak to Jenesis'}
        >
          <Icon name={listening ? 'stop' : 'mic'} size={24} />
        </button>
        <form
          className="composer-input"
          onSubmit={(event) => {
            event.preventDefault();
            send(draft);
          }}
        >
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Type a request…"
            aria-label="Message Jenesis"
            enterKeyHint="send"
          />
          <button type="submit" className="send" disabled={!draft.trim()}>
            Send
          </button>
        </form>
      </div>

      <div className="assistant-tools">
        <button
          type="button"
          className="link"
          onClick={() => saveSettings({ speech: !state.settings.speech })}
        >
          <Icon name="speaker" size={16} /> Spoken replies {state.settings.speech ? 'on' : 'off'}
        </button>
        {messages.length > 0 && (
          <button type="button" className="link link--quiet" onClick={clearMessages}>
            Clear conversation
          </button>
        )}
      </div>
    </div>
  );
}
