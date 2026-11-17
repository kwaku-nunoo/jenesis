# Jenesis

Adaptive AI-powered Personal Life Operating System — voice-first core app.

Speak, and it is handled: Jenesis adds tasks, sets reminders, keeps notes and reads back your day. Mobile-first, installable, and stored on the device so it keeps working offline.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # typecheck + production build
```

## What works today

- **Voice in and out** — browser speech recognition for commands, speech synthesis for replies.
- **Commands** — add a task, set a reminder, add an event, save a note, complete or delete items, search notes, ask about the day, free time and what is next.
- **Tasks** — title, optional due date, complete, delete.
- **Agenda** — events per day, overlap warnings, free windows inside your working hours.
- **Notes** — kept and searchable by text or by voice.
- **Home** — next up, free time left, today's schedule, priority tasks.
- **PWA** — installable, offline app shell through a service worker.
- **Reminders** — in-app alerts while open, plus background checks from the service worker on installed Android PWAs.

## Platform limits (not faked)

- Voice input needs the browser speech engine: Chrome on Android, Safari on iPhone. Typing always works.
- Reminders when the app is fully closed are best effort. Chrome on Android may wake the service worker periodically; iOS will not. Guaranteed background delivery needs Web Push from a server or the Android companion.
- Understanding is a deterministic command parser, not a cloud model. Unrecognised requests say so instead of inventing an answer.
- No account and no sync yet: data lives in this browser's storage. Download a copy from Settings before clearing site data.

## Layout

```
src/
  App.tsx              shell, navigation and screens
  components/          Home, Assistant, Tasks, Agenda, Notes, Settings
  lib/store.ts         local-first store, CRUD and scheduling helpers
  lib/assistant.ts     voice command parsing and action execution
  lib/when.ts          natural-language time parsing
  lib/speech.ts        speech recognition and synthesis wrappers
  lib/mirror.ts        reminder mirror for the service worker (IndexedDB)
public/sw.js           offline shell and background notifications
```

## Deploy

`deploy.manifest.json` describes the static build for Cloudflare Workers hosting; `npm run build` then deploy with that manifest.
