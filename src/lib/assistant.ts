/**
 * Jenesis core assistant.
 *
 * This is a real, deterministic command handler: it parses what was said,
 * performs the action against locally stored data and reports only what
 * actually happened. There is no simulated AI text — when a request is not
 * understood it says so and offers what it can do.
 */
import * as db from './store';
import { extractWhen, fmtDayLabel, fmtDuration, fmtTime, longDate, wakeWordStripped } from './when';
import type { State, Task } from './types';

export interface AssistantResult {
  reply: string;
  changed: boolean;
}

const HELP =
  'I can add tasks, set reminders, keep notes and tell you what your day looks like. ' +
  'Try “remind me to call Dad at 6pm”, “add task finish the Arduino sketch tomorrow”, ' +
  '“remember that I decided to study at the library” or “what’s on my schedule?”.';

function cap(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function lowerFirst(text: string): string {
  return text ? text.charAt(0).toLowerCase() + text.slice(1) : text;
}

function listJoin(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clockLabel(value: string): string {
  const [hours, minutes] = value.split(':').map((part) => Number.parseInt(part, 10));
  const date = new Date();
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return fmtTime(date);
}

function findTask(query: string): Task | null {
  const state = db.getState();
  const needle = normalise(query);
  if (!needle) return null;

  const scored = state.tasks
    .map((task) => {
      const haystack = normalise(task.title);
      let score = 0;
      if (haystack === needle) score = 120;
      else if (haystack.includes(needle)) score = 90 - Math.abs(haystack.length - needle.length);
      else if (needle.includes(haystack)) score = 70 - Math.abs(haystack.length - needle.length);
      else {
        const words = needle.split(' ').filter((word) => word.length > 2 && haystack.includes(word));
        score = words.length ? 20 + words.length * 6 : 0;
      }
      if (task.done) score -= 25;
      return { task, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.task ?? null;
}

function describeDay(day: Date, state: State): string {
  const events = db.eventsOn(day, state);
  const due = db.tasksDueOn(day, state);
  const free = db.freeMinutesRemaining(day, state);
  const label = fmtDayLabel(day);
  const parts: string[] = [];

  if (events.length) {
    const described = events
      .slice(0, 5)
      .map((event) => `${fmtTime(event.start)} ${event.title}`)
      .join(', ');
    parts.push(`${label} you have ${events.length} ${events.length === 1 ? 'event' : 'events'}: ${described}.`);
  } else {
    parts.push(label === 'Today' ? 'Today is clear — nothing scheduled.' : `${label} is clear.`);
  }

  if (due.length) {
    parts.push(
      `${due.length === 1 ? 'One task is' : `${due.length} tasks are`} due ${
        label === 'Today' ? 'today' : label.toLowerCase()
      }: ${listJoin(due.slice(0, 4).map((task) => task.title))}.`
    );
  }

  parts.push(
    `${fmtDuration(free)} of free time ${label === 'Today' ? 'left' : 'open'} between ${clockLabel(
      state.settings.workStart
    )} and ${clockLabel(state.settings.workEnd)}.`
  );

  return parts.join(' ');
}

function describeTasks(state: State): string {
  const open = db.openTasks(state);
  if (open.length === 0) return 'You have no open tasks. Your list is clear.';
  const described = open
    .slice(0, 5)
    .map((task) => `${task.title}${task.due ? ` (${fmtDayLabel(task.due)} ${fmtTime(task.due)})` : ''}`);
  return `You have ${open.length} open ${open.length === 1 ? 'task' : 'tasks'}: ${listJoin(described)}.`;
}

export function handle(input: string): AssistantResult {
  const raw = wakeWordStripped(input).trim();
  if (!raw) return { reply: 'I didn’t catch that. Say it again?', changed: false };

  const phrase = raw.toLowerCase();
  const state = db.getState();

  /* ------------------------------------------------------------ social */
  if (/^(hi|hey|hello|good morning|good afternoon|good evening)\b/.test(phrase)) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const name = state.settings.name.trim();
    return {
      reply: `${greeting}${name ? `, ${name}` : ''}. ${describeDay(new Date(), state)}`,
      changed: false,
    };
  }

  if (/^(thanks|thank you|cheers)\b/.test(phrase)) {
    return { reply: 'Any time.', changed: false };
  }

  if (/\b(help|what can you do|what do you do|commands)\b/.test(phrase)) {
    return { reply: HELP, changed: false };
  }

  /* -------------------------------------------------------------- time */
  if (/^what(’s|'s| is)? the time\b/.test(phrase) || /^what time is it\b/.test(phrase)) {
    return { reply: `It’s ${fmtTime(new Date())}.`, changed: false };
  }

  if (/^what(’s|'s| is)? (the )?date\b/.test(phrase) || /^what day is it\b/.test(phrase)) {
    return { reply: `It’s ${longDate()}.`, changed: false };
  }

  /* --------------------------------------------------------- next event */
  if (/^what(’s|'s| is)? next\b/.test(phrase) || /^what(’s|'s| is) my next\b/.test(phrase)) {
    const next = db.nextEvent(state);
    if (!next) return { reply: 'Nothing ahead of you right now.', changed: false };
    return {
      reply: `Next up: ${next.title}, ${fmtDayLabel(next.start)} at ${fmtTime(next.start)}.`,
      changed: false,
    };
  }

  /* ------------------------------------------------------ schedule look */
  const asksSchedule =
    /\b(schedule|agenda|calendar|my day|happening|going on|planned)\b/.test(phrase) ||
    /^what(’s|'s| is)? on\b/.test(phrase) ||
    /^do i have (anything|any events|any plans)/.test(phrase);

  if (asksSchedule && !/^add|^create|^schedule a|^book/.test(phrase)) {
    const day = new Date();
    if (/\btomorrow\b/.test(phrase)) day.setDate(day.getDate() + 1);
    return { reply: describeDay(day, state), changed: false };
  }

  /* ------------------------------------------------------- list tasks */
  if (
    /\b(tasks?|to-?dos?|reminders?)\b/.test(phrase) &&
    /\b(what|list|show|any|my|open|do i have)\b/.test(phrase) &&
    !/^add|^create|^new|^remind|^delete|^remove|^mark|^complete/.test(phrase)
  ) {
    return { reply: describeTasks(state), changed: false };
  }

  /* ------------------------------------------------------ complete task */
  const completeMatch = raw.match(
    /^(?:mark|complete|finish|tick|check off)\b\s*(?:the\s+)?(?:task\s+)?(.+?)(?:\s+(?:as\s+)?(?:done|complete|completed))?$/i
  );
  if (completeMatch) {
    const target = findTask(completeMatch[1]);
    if (!target) {
      return { reply: `I can’t find a task matching “${completeMatch[1].trim()}”.`, changed: false };
    }
    if (target.done) {
      return { reply: `“${target.title}” is already done.`, changed: false };
    }
    db.toggleTask(target.id);
    const after = db.getState().tasks.find((task) => task.id === target.id);
    if (!after?.done) return { reply: 'That didn’t save. Try again?', changed: false };
    return { reply: `Done — “${target.title}” is marked complete.`, changed: true };
  }

  /* --------------------------------------------------------- reminders */
  const reminderMatch = raw.match(/^remind me\s*(?:to|about|that)?\s+(.+)$/i);
  if (reminderMatch) {
    const { date, text } = extractWhen(reminderMatch[1]);
    const title = (text || reminderMatch[1]).trim();
    if (!title) return { reply: 'What should I remind you about?', changed: false };
    const task = db.addTask({ title, due: date, source: 'voice' });
    const saved = db.getState().tasks.find((entry) => entry.id === task.id);
    if (!saved) return { reply: 'That reminder didn’t save. Try again?', changed: false };
    const when = saved.due ? `${fmtDayLabel(saved.due)} at ${fmtTime(saved.due)}` : 'with no set time';
    return { reply: `Done — I’ll remind you to ${lowerFirst(saved.title)}, ${when}.`, changed: true };
  }

  /* ------------------------------------------------------- add an event */
  const eventMatch = raw.match(
    /^(?:add|create|schedule|book|plan)\b\s*(?:a|an|the)?\s*(?:new\s+)?(event|meeting|lecture|class|appointment|exam|session|call)\b\s*(?:called|named|about|for|with)?\s*(.*)$/i
  );
  if (eventMatch) {
    const { date, text } = extractWhen(eventMatch[2] ?? '');
    const title = text ? cap(text) : cap(eventMatch[1]);
    if (!date) {
      return {
        reply: `What time should I put “${title.toLowerCase()}” at? Say something like “schedule ${eventMatch[1]} at 3pm”.`,
        changed: false,
      };
    }
    const event = db.addEvent({ title, start: date, source: 'voice' });
    const saved = db.getState().events.find((entry) => entry.id === event.id);
    if (!saved) return { reply: 'That didn’t save. Try again?', changed: false };
    const clash = db
      .conflicts(new Date(saved.start))
      .find(([a, b]) => a.id === saved.id || b.id === saved.id);
    const warning = clash ? ' That overlaps another commitment — worth adjusting.' : '';
    return {
      reply: `Added “${saved.title}” on ${fmtDayLabel(saved.start)} at ${fmtTime(saved.start)}.${warning}`,
      changed: true,
    };
  }

  /* ------------------------------------------------------- add a task */
  const taskMatch = raw.match(
    /^(?:add|create|new|put|jot)\b\s*(?:a|an|the)?\s*(?:new\s+)?(?:task|to-?do|reminder)?\s*(?:to\s+|for\s+|that\s+)?(.+)$/i
  );
  if (taskMatch) {
    const { date, text } = extractWhen(taskMatch[1]);
    const title = (text || taskMatch[1]).trim();
    if (!title) return { reply: 'What should the task say?', changed: false };
    const task = db.addTask({ title, due: date, source: 'voice' });
    const saved = db.getState().tasks.find((entry) => entry.id === task.id);
    if (!saved) return { reply: 'That task didn’t save. Try again?', changed: false };
    const when = saved.due ? ` It’s due ${fmtDayLabel(saved.due)} at ${fmtTime(saved.due)}.` : '';
    return { reply: `Added “${saved.title}” to your tasks.${when}`, changed: true };
  }

  /* ------------------------------------------------------------- notes */
  const noteMatch = raw.match(/^(?:remember|note|save|keep|jot down)\b\s*(?:that|down)?\s+(.+)$/i);
  if (noteMatch) {
    const text = noteMatch[1].trim();
    if (!text) return { reply: 'What should I remember?', changed: false };
    const note = db.addNote(text, 'voice');
    const saved = db.getState().notes.find((entry) => entry.id === note.id);
    if (!saved) return { reply: 'That note didn’t save. Try again?', changed: false };
    return { reply: `Noted — I’ll keep that. ${cap(saved.text)}`, changed: true };
  }

  /* ------------------------------------------------------ search notes */
  const searchMatch = raw.match(
    /^(?:search|find|look up|what did i|do i have any notes?)\b\s*(?:my\s+)?(?:notes?|memory|memories)?\s*(?:about|on|for|regarding)?\s*(.*)$/i
  );
  if (searchMatch && /\b(notes?|memory|memories)\b/i.test(raw)) {
    const query = normalise(searchMatch[1] ?? '');
    if (!query) {
      const total = state.notes.length;
      return {
        reply: total ? `You have ${total} ${total === 1 ? 'note' : 'notes'} saved.` : 'You have no notes yet.',
        changed: false,
      };
    }
    const hits = state.notes
      .filter((note) => normalise(note.text).includes(query))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (hits.length === 0) return { reply: `I found no notes about “${searchMatch[1].trim()}”.`, changed: false };
    const described = hits
      .slice(0, 3)
      .map((note) => `“${note.text}” (${fmtDayLabel(note.createdAt)})`)
      .join('; ');
    return { reply: `Here’s what I found: ${described}.`, changed: false };
  }

  /* ------------------------------------------------------------ delete */
  const deleteMatch = raw.match(/^(?:delete|remove|cancel)\b\s*(?:the\s+)?(task|note|event)?\s*(.+)$/i);
  if (deleteMatch) {
    const kind = (deleteMatch[1] ?? 'task').toLowerCase();
    const query = deleteMatch[2].trim();

    if (kind === 'note' || kind === 'notes') {
      const needle = normalise(query);
      const note = db
        .getState()
        .notes.find((entry) => normalise(entry.text).includes(needle) && needle.length > 2);
      if (!note) return { reply: `I couldn’t find a note about “${query}”.`, changed: false };
      db.deleteNote(note.id);
      return { reply: `Deleted that note: “${note.text}”.`, changed: true };
    }

    if (kind === 'event') {
      const needle = normalise(query);
      const event = db.getState().events.find((entry) => normalise(entry.title).includes(needle));
      if (!event) return { reply: `I couldn’t find an event matching “${query}”.`, changed: false };
      db.deleteEvent(event.id);
      return { reply: `Deleted “${event.title}” from your schedule.`, changed: true };
    }

    const task = findTask(query);
    if (!task) return { reply: `I couldn’t find a task matching “${query}”.`, changed: false };
    db.deleteTask(task.id);
    return { reply: `Deleted “${task.title}”.`, changed: true };
  }

  /* ---------------------------------------------------------- fallback */
  return {
    reply: `I’m not sure how to do that yet — I’d rather say so than guess. ${HELP}`,
    changed: false,
  };
}
