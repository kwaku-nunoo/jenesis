import { useState } from 'react';
import { Icon } from './Icon';
import { addTask, deleteTask, openTasks, toggleTask, useStore } from '../lib/store';
import { fmtDayLabel, fmtTime, toInputValue } from '../lib/when';

export function Tasks() {
  const state = useStore();
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');

  const open = openTasks(state);
  const done = state.tasks.filter((task) => task.done);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const clean = title.trim();
    if (!clean) return;
    addTask({ title: clean, due: due ? new Date(due) : null, source: 'typed' });
    setTitle('');
    setDue('');
  }

  return (
    <div className="stack">
      <header className="screen-head">
        <h1 className="display display--sm">Tasks</h1>
        <p className="muted">{open.length ? `${open.length} open` : 'Nothing open'}</p>
      </header>

      <form className="card form" onSubmit={submit}>
        <label className="field">
          <span>New task</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Finish the Arduino sketch"
            required
          />
        </label>
        <label className="field">
          <span>Due (optional)</span>
          <input
            type="datetime-local"
            value={due}
            min={toInputValue(new Date())}
            onChange={(event) => setDue(event.target.value)}
          />
        </label>
        <button type="submit" className="btn btn--primary">
          <Icon name="plus" size={18} /> Add task
        </button>
      </form>

      <section className="card">
        <header className="card-head">
          <h2>Open</h2>
        </header>
        {open.length === 0 ? (
          <p className="muted">No open tasks. Add one above, or tell Jenesis out loud.</p>
        ) : (
          <ul className="rows">
            {open.map((task) => (
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
                  {task.due && (
                    <span className="due">
                      {fmtDayLabel(task.due)} · {fmtTime(task.due)}
                    </span>
                  )}
                  {task.source === 'voice' && <span className="tag">voice</span>}
                </span>
                <button
                  type="button"
                  className="icon-btn icon-btn--quiet"
                  aria-label={`Delete ${task.title}`}
                  onClick={() => deleteTask(task.id)}
                >
                  <Icon name="trash" size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {done.length > 0 && (
        <section className="card">
          <header className="card-head">
            <h2>Done</h2>
            <span className="muted">{done.length}</span>
          </header>
          <ul className="rows">
            {done.map((task) => (
              <li key={task.id} className="row row--task is-done">
                <button
                  type="button"
                  className="check is-checked"
                  aria-label={`Reopen ${task.title}`}
                  onClick={() => toggleTask(task.id)}
                >
                  <Icon name="check" size={14} />
                </button>
                <span className="row-main">{task.title}</span>
                <button
                  type="button"
                  className="icon-btn icon-btn--quiet"
                  aria-label={`Delete ${task.title}`}
                  onClick={() => deleteTask(task.id)}
                >
                  <Icon name="trash" size={18} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
