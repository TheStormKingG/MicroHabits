// MicroHabits Service Worker
// Handles background notifications via periodicSync when supported

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle push events from the server-side send-push Edge Function
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    // Build the deep-link URL: /MicroHabits/schedule#<slotId>
    const slotId = (data.tag ?? '').replace(/^habit-/, '');
    const url = slotId
      ? `/MicroHabits/schedule#${slotId}`
      : (data.url ?? '/MicroHabits/schedule');

    event.waitUntil(
      self.registration.showNotification(data.title ?? 'MicroHabits', {
        body: data.body ?? '',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: data.tag ?? 'habit',
        // Pass the URL inside notification data so notificationclick can use it
        data: { url },
      })
    );
  } catch {
    // non-JSON push payload — show a generic notification
    event.waitUntil(
      self.registration.showNotification('MicroHabits', {
        body: event.data.text(),
        icon: '/pwa-192x192.png',
        data: { url: '/MicroHabits/schedule' },
      })
    );
  }
});

// Handle notification click — navigate to the specific schedule slot
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? '/MicroHabits/schedule';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // If app is already open, navigate it to the target URL
      for (const client of clients) {
        if ('navigate' in client) {
          return client.navigate(targetUrl).then((c) => c?.focus());
        }
        if ('focus' in client) return client.focus();
      }
      // Otherwise open a new window
      return self.clients.openWindow(targetUrl);
    })
  );
});

// periodicSync – fires when browser supports it and app is registered
// (requires 'periodic-background-sync' permission, Chrome 80+ only)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'habit-check') {
    event.waitUntil(checkHabitsAndNotify());
  }
});

async function checkHabitsAndNotify() {
  // This is a best-effort background check.
  // Real scheduling is done in the foreground via setTimeout.
  // Here we just show a morning reminder if it's between 4:00–4:35 AM.
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  if (h === 4 && m <= 35) {
    await self.registration.showNotification('⏰ Good morning!', {
      body: "Time to start your MicroHabits routine.",
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
    });
  }
}
