import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { freeMinutesRemaining, nextEvent, openTasks, conflicts, eventsOn, toggleTask, useStore } from '../lib/store';
import { fmtDuration, fmtTime, longDate, shortDate, sameDay } from '../lib/when';
import type { Tab } from './Nav';

export function Home({ go }: { go: (tab: Tab) => void }) {
  const state = useStore();
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const name = state.settings.name.trim();
  const todayEvents = eventsOn(now, state);
  const next = nextEvent(state);
  const tasks = openTasks(state);
  const free = freeMinutesRemaining(now, state);
  const clashes = conflicts(now, state);
  const workEnd = new Date(now);
  {
    const [endHour, endMinute] = state.settings.workEnd.split(':').map((part) => Number.parseInt(part, 10));
    workEnd.setHours(endHour || 21, endMinute || 0, 0, 0);
  }

  return (
    <div className="stack">
      <section className="hero">
        <p className="eyebrow">{longDate(now)}</p>
        <h1 className="display">
          {greeting}
          {name ? `, ${name}` : ''}
        </h1>
        <p className="lede">Speak, and it is handled — tasks, reminders and notes, kept on your device.</p>
        <button type="button" className="voice-cta" onClick={() => go('jenesis')}>
          <span className="voice-cta-icon">
            <Icon name="mic" size={22} />
          </span>
          Talk to Jenesis
        </button>
      </section>

      {clashes.length > 0 && (
        <div className="banner banner--warn" role="status">
          <strong>Heads up.</strong> {clashes.length === 1 ? 'Two commitments overlap' : `${clashes.length} commitments overlap`} today — {clashes[0][0].title} and {clashes[0][1].title}.
        </div>
      )}

      <section className="grid-2">
        <article className="card">
          <header className="card-head">
            <h2>Next up</h2>
          </header>
          {next ? (
            <div>
              <p className="card-title">{next.title}</p>
              <p className="muted">
                {sameDay(new Date(next.start), now) ? 'Today' : shortDate(new Date(next.start))} at {fmtTime(next.start)}
              </p>
            </div>
          ) : (
            <p className="muted">Nothing scheduled ahead. The day is yours.</p>
          )}
        </article>

        <article className="card">
          <header className="card-head">
            <h2>Free time</h2>
          </header>
          <p className="stat">{fmtDuration(free)}</p>
          <p className="muted">Open until {fmtTime(workEnd)}</p>
        </article>
      </section>

      <section className="card">
        <header className="card-head">
          <h2>Today</h2>
          <button type="button" className="link" onClick={() => go('agenda')}>
            Open agenda
          </button>
        </header>
        {todayEvents.length === 0 ? (
          <p className="muted">Nothing on the schedule. Ask me to block time when you need it.</p>
        ) : (
          <ul className="rows">
            {todayEvents.map((event) => (
              <li key={event.id} className="row">
                <span className="time-chip">{fmtTime(event.start)}</span>
                <span className="row-main">{event.title}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <header className="card-head">
          <h2>Priority tasks</h2>
          <button type="button" className="link" onClick={() => go('tasks')}>
            All tasks
          </button>
        </header>
        {tasks.length === 0 ? (
          <p className="muted">No open tasks. Say “add task …” to start one.</p>
        ) : (
          <ul className="rows">
            {tasks.slice(0, 4).map((task) => (
              <li key={task.id} className="row row--task">
                <button
                  type="button"
                  className="check"
                  aria-label={`Mark ${task.title} complete`}
                  onClick={() => toggleTask(task.id)}
                >
                  <Icon name="check" size={14} />
                </button>
                <span className="row-main">
                  {task.title}
                  {task.due && <span className="due">{fmtTime(task.due)} · {shortDate(new Date(task.due))}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="footnote">
        Voice input needs a browser with speech support — Chrome on Android, Safari on iPhone. Reminders alert while
        Jenesis is open.
      </p>
    </div>
  );
}
