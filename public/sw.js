// MicroHabits Service Worker
// Handles background notifications via periodicSync when supported

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle push events (for future server-sent push support)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title ?? 'MicroHabits', {
        body: data.body ?? '',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        data: data.data ?? {},
      })
    );
  } catch {
    // non-JSON push payload
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('/');
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
