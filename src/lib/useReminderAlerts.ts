import { useEffect } from 'react';
import { getState } from './store';

type PeriodicSyncCapable = ServiceWorkerRegistration & {
  periodicSync?: {
    register(tag: string, options: { minInterval: number }): Promise<void>;
  };
};

/**
 * Delivers reminders. While the app is open it checks in-page; it also wakes
 * the service worker so the browser can raise reminders when the app is in the
 * background or closed (best effort — see README notes on platform support).
 */
export function useReminderAlerts(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    let cancelled = false;

    const wakeWorker = async () => {
      if (!('serviceWorker' in navigator)) return;
      try {
        const registration = (await navigator.serviceWorker.ready) as PeriodicSyncCapable;
        if (registration.periodicSync) {
          try {
            await registration.periodicSync.register('jenesis-reminders', {
              minInterval: 15 * 60 * 1000,
            });
          } catch {
            /* periodic sync is permission and engagement gated */
          }
        }
        registration.active?.postMessage('check-reminders');
      } catch {
        /* no service worker in this context */
      }
    };

    void wakeWorker();

    const seen = new Set<string>();
    const tick = () => {
      if (cancelled) return;
      const now = Date.now();
      for (const task of getState().tasks) {
        if (task.done || !task.due) continue;
        const due = new Date(task.due).getTime();
        if (due <= now && now - due < 5 * 60_000 && !seen.has(task.id)) {
          seen.add(task.id);
          try {
            new Notification('Jenesis reminder', { body: task.title, tag: task.id });
          } catch {
            /* notification failures must never break the app */
          }
        }
      }
      void wakeWorker();
    };

    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [enabled]);
}
