import type { SlotDefinition, NotificationSettings } from '../types';
import { todayISO } from './completion';

export function canUseNotifications(): boolean {
  return 'Notification' in window;
}

export function canUseServiceWorker(): boolean {
  return 'serviceWorker' in navigator;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!canUseNotifications()) return 'denied';
  const perm = await Notification.requestPermission();
  return perm;
}

interface ScheduledNotif {
  slotId: string;
  timeoutId: ReturnType<typeof setTimeout>;
}

const _scheduled: ScheduledNotif[] = [];

export function clearAllNotifications(): void {
  for (const s of _scheduled) {
    clearTimeout(s.timeoutId);
  }
  _scheduled.length = 0;
}

function fireNotification(title: string, body: string): void {
  if (!canUseNotifications() || Notification.permission !== 'granted') return;
  new Notification(title, { body, icon: '/pwa-192x192.png', badge: '/pwa-192x192.png' });
}

export function scheduleNotificationsForToday(
  slots: SlotDefinition[],
  settings: NotificationSettings
): void {
  if (!settings.enabled || Notification.permission !== 'granted') return;

  clearAllNotifications();

  const now = new Date();

  for (const slot of slots) {
    const [h, m] = slot.time.split(':').map(Number);
    const triggerTime = new Date();
    triggerTime.setHours(h, m - settings.minutesBefore, 0, 0);

    const msUntil = triggerTime.getTime() - now.getTime();
    if (msUntil <= 0) continue; // already past

    const timeoutId = setTimeout(() => {
      fireNotification(
        `⏰ MicroHabits – ${slot.label}`,
        `Time to: ${slot.doText}`
      );
    }, msUntil);

    _scheduled.push({ slotId: slot.id, timeoutId });
  }
}

export function sendTestNotification(): void {
  fireNotification('MicroHabits – Test', 'Notifications are working!');
}

/** Returns today's scheduled slots that haven't fired yet (for display) */
export function getUpcomingSlots(
  slots: SlotDefinition[],
  minutesBefore: number
): SlotDefinition[] {
  const now = new Date();
  return slots.filter((slot) => {
    const [h, m] = slot.time.split(':').map(Number);
    const triggerTime = new Date();
    triggerTime.setHours(h, m - minutesBefore, 0, 0);
    return triggerTime.getTime() > now.getTime();
  });
}

export { todayISO };
