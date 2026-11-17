/** Natural-language date/time parsing and formatting helpers. */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function fmtTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date
    .toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })
    .toLowerCase()
    .replace(/\s/g, ' ');
}

export function fmtDayLabel(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (sameDay(date, today)) return 'Today';
  if (sameDay(date, tomorrow)) return 'Tomorrow';
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function longDate(date: Date = new Date()): string {
  return date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

export function shortDate(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function fmtDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours && mins) return `${hours}h ${mins}m`;
  if (hours) return `${hours}h`;
  return `${mins}m`;
}

export function toInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function withTime(base: Date, hours: number, minutes: number): Date {
  const copy = new Date(base);
  copy.setHours(hours, minutes, 0, 0);
  return copy;
}

function tidy(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/^[\s,.;:–-]+/, '')
    .replace(/\b(at|on|by|for|from)$/i, '')
    .replace(/[\s,.;:–-]+$/, '')
    .trim();
}

export interface WhenResult {
  /** Parsed moment, or null when the phrase carried no time. */
  date: Date | null;
  /** The remaining text with the time phrase removed. */
  text: string;
}

/**
 * Pulls a time expression such as "tomorrow at 6pm", "in 30 minutes",
 * "at 17:30" or "tonight" out of a spoken or typed phrase.
 */
export function extractWhen(input: string, now: Date = new Date()): WhenResult {
  let text = ` ${input} `;
  let date: Date | null = null;

  const relative = text.match(/\bin\s+(\d{1,3})\s*(minutes?|mins?|hours?|hrs?)\b/i);
  if (relative) {
    const amount = Number.parseInt(relative[1], 10);
    const isHours = /^h/i.test(relative[2]);
    date = new Date(now.getTime() + amount * (isHours ? HOUR : MINUTE));
    text = text.replace(relative[0], ' ');
  }

  const dayMatch = text.match(/\b(today|tonight|this evening|this afternoon|this morning|tomorrow)\b/i);
  const dayWord = dayMatch ? dayMatch[1].toLowerCase() : '';
  const base = new Date(now);
  if (dayWord === 'tomorrow') base.setDate(base.getDate() + 1);
  if (dayMatch) text = text.replace(dayMatch[0], ' ');

  let hour: number | null = null;
  let minute = 0;

  const clock = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  const afterAt = text.match(/\b(?:at|by)\s+(\d{1,2})(?::(\d{2}))?\b/i);
  const bare = text.match(/\b(\d{1,2}):(\d{2})\b/);

  if (clock) {
    hour = Number.parseInt(clock[1], 10);
    minute = clock[2] ? Number.parseInt(clock[2], 10) : 0;
    const suffix = clock[3].toLowerCase();
    if (suffix === 'pm' && hour < 12) hour += 12;
    if (suffix === 'am' && hour === 12) hour = 0;
    text = text.replace(clock[0], ' ');
  } else if (afterAt) {
    hour = Number.parseInt(afterAt[1], 10);
    minute = afterAt[2] ? Number.parseInt(afterAt[2], 10) : 0;
    text = text.replace(afterAt[0], ' ');
  } else if (bare) {
    hour = Number.parseInt(bare[1], 10);
    minute = Number.parseInt(bare[2], 10);
    text = text.replace(bare[0], ' ');
  }

  if (hour !== null && Number.isFinite(hour) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
    let resolved = withTime(base, hour, minute);
    if ((dayWord === 'tonight' || dayWord === 'this evening') && hour < 12) {
      resolved = withTime(base, hour + 12, minute);
    }
    date = resolved;
  } else if (dayWord) {
    const defaults: Record<string, number> = {
      'this morning': 9,
      'this afternoon': 14,
      'this evening': 19,
      tonight: 19,
      today: 9,
      tomorrow: 9,
    };
    date = withTime(base, defaults[dayWord] ?? 9, 0);
  }

  return { date: date ?? null, text: tidy(text) };
}

export function wakeWordStripped(input: string): string {
  return input
    .replace(/^\s*(hey\s+)?jenesis[,:.\s]+/i, '')
    .replace(/\bplease\b/gi, '')
    .replace(/^(can|could|would)\s+you\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}
