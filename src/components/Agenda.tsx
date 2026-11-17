import { useState } from 'react';
import { Icon } from './Icon';
import { addEvent, conflicts, deleteEvent, eventsOn, freeSlots, useStore } from '../lib/store';
import { fmtDuration, fmtTime, longDate, toInputValue } from '../lib/when';

export function Agenda() {
  const state = useStore();
  const [day, setDay] = useState(() => new Date());
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const events = eventsOn(day, state);
  const slots = freeSlots(day, state);
  const clashes = conflicts(day, state);

  function shift(days: number) {
    const next = new Date(day);
    next.setDate(next.getDate() + days);
    setDay(next);
  }

  function submit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    const clean = title.trim();
    if (!clean || !start) return;
    addEvent({
      title: clean,
      start: new Date(start),
      end: end ? new Date(end) : null,
      source: 'typed',
    });
    setTitle('');
    setStart('');
    setEnd('');
  }

  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);

  return (
    <div className="stack">
      <header className="screen-head">
        <h1 className="display display--sm">Agenda</h1>
        <p className="muted">{longDate(day)}</p>
      </header>

      <div className="day-switcher">
        <button type="button" className="btn btn--ghost" onClick={() => shift(-1)} aria-label="Previous day">
          ←
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => setDay(new Date())}>
          Today
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => shift(1)} aria-label="Next day">
          →
        </button>
      </div>

      {clashes.length > 0 && (
        <div className="banner banner--warn" role="status">
          <strong>Overlap.</strong> {clashes[0][0].title} and {clashes[0][1].title} happen at the same time.
        </div>
      )}

      <section className="card">
        <header className="card-head">
          <h2>{events.length ? `${events.length} scheduled` : 'Schedule'}</h2>
          <span className="muted">{fmtDuration(slots.reduce((total, slot) => total + slot.minutes, 0))} free</span>
        </header>
        {events.length === 0 ? (
          <p className="muted">Nothing planned. Add some time below, or ask Jenesis to schedule it.</p>
        ) : (
          <ul className="rows">
            {events.map((event) => (
              <li key={event.id} className="row">
                <span className="time-chip">{fmtTime(event.start)}</span>
                <span className="row-main">
                  {event.title}
                  {event.end && <span className="due">until {fmtTime(event.end)}</span>}
                </span>
                <button
                  type="button"
                  className="icon-btn icon-btn--quiet"
                  aria-label={`Delete ${event.title}`}
                  onClick={() => deleteEvent(event.id)}
                >
                  <Icon name="trash" size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <header className="card-head">
          <h2>Free windows</h2>
        </header>
        {slots.length === 0 ? (
          <p className="muted">No free windows of 30 minutes or more between your working hours.</p>
        ) : (
          <ul className="chips">
            {slots.map((slot) => (
              <li key={slot.start.toISOString()} className="chip chip--static">
                {fmtTime(slot.start)} – {fmtTime(slot.end)} · {fmtDuration(slot.minutes)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <form className="card form" onSubmit={submit}>
        <label className="field">
          <span>New commitment</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. CS lecture"
            required
          />
        </label>
        <div className="form-row">
          <label className="field">
            <span>Starts</span>
            <input
              type="datetime-local"
              value={start}
              min={toInputValue(dayStart)}
              onChange={(event) => setStart(event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Ends (optional)</span>
            <input
              type="datetime-local"
              value={end}
              min={start || toInputValue(dayStart)}
              onChange={(event) => setEnd(event.target.value)}
            />
          </label>
        </div>
        <button type="submit" className="btn btn--primary">
          <Icon name="plus" size={18} /> Add to agenda
        </button>
      </form>
    </div>
  );
}
