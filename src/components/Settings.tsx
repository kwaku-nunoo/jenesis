import { useState } from 'react';
import { exportState, resetAll, saveSettings, useStore } from '../lib/store';

export function Settings() {
  const state = useStore();
  const settings = state.settings;
  const [note, setNote] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  function download() {
    const blob = new Blob([exportState()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'jenesis-data.json';
    link.click();
    URL.revokeObjectURL(url);
    setNote('Your data was downloaded as jenesis-data.json.');
  }

  async function enableNotifications() {
    if (typeof Notification === 'undefined') {
      setNote('This browser has no notification support.');
      return;
    }
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      saveSettings({ reminders: true });
      setNote('Reminders are on. Install Jenesis to your home screen so alerts can reach you outside the app.');
    } else {
      saveSettings({ reminders: false });
      setNote('Permission was not granted, so reminders stay silent.');
    }
  }

  return (
    <div className="stack">
      <header className="screen-head">
        <h1 className="display display--sm">Settings</h1>
        <p className="muted">Everything here lives on this device.</p>
      </header>

      <section className="card form">
        <label className="field">
          <span>What should I call you?</span>
          <input
            value={settings.name}
            onChange={(event) => saveSettings({ name: event.target.value })}
            placeholder="Your name"
          />
        </label>
        <div className="form-row">
          <label className="field">
            <span>Day starts</span>
            <input
              type="time"
              value={settings.workStart}
              onChange={(event) => saveSettings({ workStart: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Day ends</span>
            <input
              type="time"
              value={settings.workEnd}
              onChange={(event) => saveSettings({ workEnd: event.target.value })}
            />
          </label>
        </div>
        <p className="hint">Free-time suggestions use these hours.</p>
      </section>

      <section className="card">
        <header className="card-head">
          <h2>Voice and alerts</h2>
        </header>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.speech}
            onChange={(event) => saveSettings({ speech: event.target.checked })}
          />
          <span>
            Speak replies out loud
            <small>Jenesis reads its answers back to you.</small>
          </span>
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={settings.reminders}
            onChange={(event) => {
              if (event.target.checked) void enableNotifications();
              else saveSettings({ reminders: false });
            }}
          />
          <span>
            Reminder notifications
            <small>
              Requires permission. Alerts arrive while the app is open, and in the background once installed on
              Android (Chrome).
            </small>
          </span>
        </label>
        <p className="hint">
          Microphone access is requested the first time you tap the mic. Voice input needs HTTPS and works best in
          Chrome on Android or Safari on iPhone.
        </p>
      </section>

      <section className="card">
        <header className="card-head">
          <h2>Your data</h2>
        </header>
        <div className="button-row">
          <button type="button" className="btn btn--ghost" onClick={download}>
            Download my data
          </button>
          {confirming ? (
            <button
              type="button"
              className="btn btn--danger"
              onClick={() => {
                resetAll();
                setConfirming(false);
                setNote('Everything was cleared from this device.');
              }}
            >
              Yes, delete everything
            </button>
          ) : (
            <button type="button" className="btn btn--quiet" onClick={() => setConfirming(true)}>
              Delete all data
            </button>
          )}
        </div>
        <p className="hint">
          Deletion removes tasks, notes, events and the conversation from this device. It cannot be undone.
        </p>
      </section>

      {note && (
        <p className="banner banner--info" role="status">
          {note}
        </p>
      )}

      <p className="footnote">
        Jenesis core · tasks, reminders, notes and agenda · offline-first, stored locally. Background wake-word alerts
        and system-level device access belong to the Android companion.
      </p>
    </div>
  );
}
