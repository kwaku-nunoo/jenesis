import { useState } from 'react';
import { Icon } from './Icon';
import { addNote, deleteNote, useStore } from '../lib/store';
import { fmtDayLabel, fmtTime } from '../lib/when';

export function Notes() {
  const state = useStore();
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');

  const needle = query.trim().toLowerCase();
  const notes = needle
    ? state.notes.filter((note) => note.text.toLowerCase().includes(needle))
    : state.notes;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const clean = text.trim();
    if (!clean) return;
    addNote(clean, 'typed');
    setText('');
  }

  return (
    <div className="stack">
      <header className="screen-head">
        <h1 className="display display--sm">Notes</h1>
        <p className="muted">{state.notes.length ? `${state.notes.length} kept` : 'Nothing kept yet'}</p>
      </header>

      <form className="card form" onSubmit={submit}>
        <label className="field">
          <span>Keep something</span>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={3}
            placeholder="A thought, a decision, something worth remembering…"
            required
          />
        </label>
        <button type="submit" className="btn btn--primary">
          <Icon name="plus" size={18} /> Save note
        </button>
      </form>

      <label className="search">
        <span className="sr-only">Search notes</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search notes…"
          type="search"
        />
      </label>

      <section className="card">
        <header className="card-head">
          <h2>{needle ? `Results for “${query.trim()}”` : 'Everything kept'}</h2>
        </header>
        {notes.length === 0 ? (
          <p className="muted">
            {needle ? 'Nothing matches that yet.' : 'Notes you save here stay on this device and can be found by voice.'}
          </p>
        ) : (
          <ul className="rows">
            {notes.map((note) => (
              <li key={note.id} className="row row--note">
                <span className="row-main">
                  {note.text}
                  <span className="due">
                    {fmtDayLabel(note.createdAt)} · {fmtTime(note.createdAt)}
                    {note.source === 'voice' ? ' · by voice' : ''}
                  </span>
                </span>
                <button
                  type="button"
                  className="icon-btn icon-btn--quiet"
                  aria-label="Delete note"
                  onClick={() => deleteNote(note.id)}
                >
                  <Icon name="trash" size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
