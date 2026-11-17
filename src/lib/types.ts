export type Priority = 'low' | 'normal' | 'high';
export type Source = 'voice' | 'typed' | 'manual';

export interface Task {
  id: string;
  title: string;
  /** ISO timestamp, or null when the task has no due date. */
  due: string | null;
  priority: Priority;
  done: boolean;
  createdAt: string;
  source: Source;
}

export interface EventItem {
  id: string;
  title: string;
  start: string;
  end: string | null;
  location: string;
  createdAt: string;
  source: Source;
}

export interface Note {
  id: string;
  text: string;
  createdAt: string;
  source: Source;
}

export interface Message {
  id: string;
  role: 'user' | 'jenesis';
  text: string;
  createdAt: string;
}

export interface Settings {
  name: string;
  /** "08:00" */
  workStart: string;
  /** "21:00" */
  workEnd: string;
  /** Speak replies out loud. */
  speech: boolean;
  /** Browser notifications for reminders. */
  reminders: boolean;
}

export interface State {
  tasks: Task[];
  events: EventItem[];
  notes: Note[];
  messages: Message[];
  settings: Settings;
}

export interface Slot {
  start: Date;
  end: Date;
  minutes: number;
}
