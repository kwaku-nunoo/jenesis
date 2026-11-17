import { useSyncExternalStore } from 'react';
import { mirrorReminders } from './mirror';
import type { EventItem, Note, Priority, Settings, Slot, Source, State, Task, Message } from './types';

const KEY = 'jenesis.state.v1';

const defaultSettings: Settings = {
  name: '',
  workStart: '08:00',
  workEnd: '21:00',
  speech: true,
  reminders: false,
};

function blank(): State {
  return { tasks: [], events: [], notes: [], messages: [], settings: { ...defaultSettings } };
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const parsed = JSON.parse(raw) as Partial<State>;
    return {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      events: Array.isArray(parsed.events) ? parsed.events : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      settings: { ...defaultSettings, ...(parsed.settings ?? {}) },
    };
  } catch {
    return blank();
  }
}

let state: State = load();
const listeners = new Set<() => void>();

export function getState(): State {
  return state;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function commit(patch: Partial<State>): void {
  state = { ...state, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage may be full or blocked; the app still works for this session */
  }
  listeners.forEach((listener) => listener());
  void mirrorReminders(state.tasks);
}

export function useStore(): State {
  return useSyncExternalStore(subscribe, getState, getState);
}

export function uid(): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && 'randomUUID' in cryptoObj) return cryptoObj.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/* ---------------------------------------------------------------- tasks */

export function addTask(input: {
  title: string;
  due?: Date | null;
  priority?: Priority;
  source?: Source;
}): Task {
  const task: Task = {
    id: uid(),
    title: input.title.trim(),
    due: input.due ? input.due.toISOString() : null,
    priority: input.priority ?? 'normal',
    done: false,
    createdAt: new Date().toISOString(),
    source: input.source ?? 'manual',
  };
  commit({ tasks: [task, ...state.tasks] });
  return task;
}

export function toggleTask(id: string): void {
  commit({ tasks: state.tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task)) });
}

export function deleteTask(id: string): void {
  commit({ tasks: state.tasks.filter((task) => task.id !== id) });
}

/* --------------------------------------------------------------- events */

export function addEvent(input: {
  title: string;
  start: Date;
  end?: Date | null;
  location?: string;
  source?: Source;
}): EventItem {
  const event: EventItem = {
    id: uid(),
    title: input.title.trim(),
    start: input.start.toISOString(),
    end: input.end ? input.end.toISOString() : null,
    location: input.location ?? '',
    createdAt: new Date().toISOString(),
    source: input.source ?? 'manual',
  };
  commit({ events: [...state.events, event] });
  return event;
}

export function deleteEvent(id: string): void {
  commit({ events: state.events.filter((event) => event.id !== id) });
}

/* ---------------------------------------------------------------- notes */

export function addNote(text: string, source: Source = 'manual'): Note {
  const note: Note = { id: uid(), text: text.trim(), createdAt: new Date().toISOString(), source };
  commit({ notes: [note, ...state.notes] });
  return note;
}

export function deleteNote(id: string): void {
  commit({ notes: state.notes.filter((note) => note.id !== id) });
}

/* ----------------------------------------------------------- conversation */

export function pushMessage(role: Message['role'], text: string): void {
  const message: Message = { id: uid(), role, text, createdAt: new Date().toISOString() };
  commit({ messages: [...state.messages, message].slice(-120) });
}

export function clearMessages(): void {
  commit({ messages: [] });
}

/* ------------------------------------------------------------- settings */

export function saveSettings(patch: Partial<Settings>): void {
  commit({ settings: { ...state.settings, ...patch } });
}

export function resetAll(): void {
  commit(blank());
}

export function exportState(): string {
  return JSON.stringify(state, null, 2);
}

/* ---------------------------------------------------------- date helpers */

export function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

export function eventsOn(day: Date, s: State = state): EventItem[] {
  return s.events
    .filter((event) => sameDay(new Date(event.start), day))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
}

export function tasksDueOn(day: Date, s: State = state): Task[] {
  return s.tasks
    .filter((task) => task.due && !task.done && sameDay(new Date(task.due), day))
    .sort((a, b) => new Date(a.due as string).getTime() - new Date(b.due as string).getTime());
}

export function nextEvent(s: State = state): EventItem | null {
  const now = Date.now();
  const upcoming = s.events
    .filter((event) => new Date(event.start).getTime() >= now - 60_000)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  return upcoming[0] ?? null;
}

function parseHM(value: string): [number, number] {
  const [h, m] = value.split(':').map((part) => Number.parseInt(part, 10));
  return [Number.isFinite(h) ? h : 8, Number.isFinite(m) ? m : 0];
}

function busyIntervals(day: Date, s: State): Array<[Date, Date]> {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);

  return s.events
    .map((event) => {
      const start = new Date(event.start);
      const end = event.end ? new Date(event.end) : new Date(start.getTime() + 60 * 60 * 1000);
      return [start, end] as [Date, Date];
    })
    .filter(([start, end]) => end > dayStart && start < dayEnd)
    .map(([start, end]) => [start < dayStart ? dayStart : start, end > dayEnd ? dayEnd : end] as [Date, Date])
    .sort((a, b) => a[0].getTime() - b[0].getTime());
}

export function freeSlots(day: Date, s: State = state): Slot[] {
  const [startH, startM] = parseHM(s.settings.workStart);
  const [endH, endM] = parseHM(s.settings.workEnd);
  const windowStart = new Date(day);
  windowStart.setHours(startH, startM, 0, 0);
  const windowEnd = new Date(day);
  windowEnd.setHours(endH, endM, 0, 0);
  if (windowEnd <= windowStart) return [];

  const slots: Slot[] = [];
  const push = (from: Date, to: Date) => {
    const minutes = Math.round((to.getTime() - from.getTime()) / 60_000);
    if (minutes >= 30) slots.push({ start: from, end: to, minutes });
  };

  let cursor = windowStart;
  for (const [busyStart, busyEnd] of busyIntervals(day, s)) {
    if (busyEnd <= cursor) continue;
    if (busyStart > cursor) push(cursor, busyStart);
    if (busyEnd > cursor) cursor = busyEnd;
  }
  if (cursor < windowEnd) push(cursor, windowEnd);
  return slots;
}

/** Free minutes left in the day from now (or the whole window for another day). */
export function freeMinutesRemaining(day: Date, s: State = state): number {
  const now = new Date();
  const today = sameDay(day, now);
  return freeSlots(day, s).reduce((total, slot) => {
    const from = today && slot.start < now ? now : slot.start;
    const minutes = Math.round((slot.end.getTime() - from.getTime()) / 60_000);
    return total + (minutes > 0 ? minutes : 0);
  }, 0);
}

export function conflicts(day: Date, s: State = state): Array<[EventItem, EventItem]> {
  const list = eventsOn(day, s);
  const found: Array<[EventItem, EventItem]> = [];
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      const a = list[i];
      const b = list[j];
      const aStart = new Date(a.start).getTime();
      const aEnd = a.end ? new Date(a.end).getTime() : aStart + 60 * 60 * 1000;
      const bStart = new Date(b.start).getTime();
      const bEnd = b.end ? new Date(b.end).getTime() : bStart + 60 * 60 * 1000;
      if (aStart < bEnd && bStart < aEnd) found.push([a, b]);
    }
  }
  return found;
}

export function openTasks(s: State = state): Task[] {
  return s.tasks
    .filter((task) => !task.done)
    .sort((a, b) => {
      const aDue = a.due ? new Date(a.due).getTime() : Number.POSITIVE_INFINITY;
      const bDue = b.due ? new Date(b.due).getTime() : Number.POSITIVE_INFINITY;
      return aDue - bDue;
    });
}
