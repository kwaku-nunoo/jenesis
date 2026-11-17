/**
 * Jenesis service worker.
 *
 * Responsibilities:
 *  - keep the app shell available offline;
 *  - raise reminder notifications from IndexedDB when the browser wakes the
 *    worker (periodic background sync on installed Android PWAs) or when a
 *    push message arrives, so reminders can reach the user while the app is
 *    closed.
 */
const CACHE = 'jenesis-v2';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg'];

const DB_NAME = 'jenesis';
const DB_VERSION = 1;
const REMINDERS = 'reminders';
const SENT = 'sent';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html').then((hit) => hit || caches.match('/')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});

/* ------------------------------------------------- reminder notifications */

function openDatabase() {
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(REMINDERS)) {
        database.createObjectStore(REMINDERS, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(SENT)) {
        database.createObjectStore(SENT, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

function readAll(database, storeName) {
  return new Promise((resolve) => {
    const request = database.transaction(storeName, 'readonly').objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => resolve([]);
  });
}

function markSent(database, id) {
  return new Promise((resolve) => {
    const transaction = database.transaction(SENT, 'readwrite');
    transaction.objectStore(SENT).put({ id, at: Date.now() });
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => resolve(false);
    transaction.onabort = () => resolve(false);
  });
}

async function raiseDueReminders() {
  const database = await openDatabase();
  if (!database) return 0;

  const now = Date.now();
  const reminders = await readAll(database, REMINDERS);
  const sent = await readAll(database, SENT);
  const alreadySent = new Set(sent.map((row) => row.id));

  let raised = 0;
  for (const reminder of reminders) {
    if (!reminder.due || alreadySent.has(reminder.id)) continue;
    const due = new Date(reminder.due).getTime();
    if (Number.isNaN(due)) continue;
    // Only chase reminders that came due in the last 12 hours.
    if (due > now || now - due > 12 * 60 * 60 * 1000) continue;

    await self.registration.showNotification('Jenesis reminder', {
      body: reminder.title,
      tag: reminder.id,
      icon: '/icon.svg',
      badge: '/icon.svg',
      data: { url: '/' },
    });
    await markSent(database, reminder.id);
    raised += 1;
  }

  database.close();
  return raised;
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'jenesis-reminders') event.waitUntil(raiseDueReminders());
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'jenesis-reminders') event.waitUntil(raiseDueReminders());
});

self.addEventListener('message', (event) => {
  if (event.data === 'check-reminders') event.waitUntil(raiseDueReminders());
});

self.addEventListener('push', (event) => {
  let payload = { title: 'Jenesis', body: 'You have a reminder waiting.' };
  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload.body = event.data.text();
    }
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icon.svg',
      badge: '/icon.svg',
      data: { url: payload.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});
