/**
 * Mirrors scheduled reminders into IndexedDB so the service worker can raise
 * them while Jenesis is closed. localStorage is not reachable from a service
 * worker, so this is the hand-off point.
 */
import type { Task } from './types';

const DB_NAME = 'jenesis';
const DB_VERSION = 1;
const STORE = 'reminders';
const SENT = 'sent';

function openDatabase(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE)) {
        database.createObjectStore(STORE, { keyPath: 'id' });
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

export async function mirrorReminders(tasks: Task[]): Promise<void> {
  const database = await openDatabase();
  if (!database) return;

  try {
    const transaction = database.transaction(STORE, 'readwrite');
    const store = transaction.objectStore(STORE);
    const scheduled = tasks.filter((task) => task.due && !task.done);
    const keep = new Set(scheduled.map((task) => task.id));

    const existing = store.getAll();
    existing.onsuccess = () => {
      for (const row of existing.result as Array<{ id: string }>) {
        if (!keep.has(row.id)) store.delete(row.id);
      }
      for (const task of scheduled) {
        store.put({ id: task.id, title: task.title, due: task.due });
      }
    };

    await new Promise<void>((resolve) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve();
      transaction.onabort = () => resolve();
    });
  } catch {
    /* background mirroring is best-effort */
  } finally {
    database.close();
  }
}
