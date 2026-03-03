import { useEffect } from 'react';
import { useSchedule } from '../contexts/ScheduleContext';
import { scheduleNotificationsForToday, clearAllNotifications } from '../utils/notifications';

/**
 * Hook that reschedules today's notifications whenever settings or slots change.
 */
export function useNotificationScheduler(): void {
  const { slots, settings } = useSchedule();

  useEffect(() => {
    if (!settings) return;

    if (settings.notifications.enabled) {
      scheduleNotificationsForToday(slots, settings.notifications);
    } else {
      clearAllNotifications();
    }

    return () => {
      clearAllNotifications();
    };
  }, [slots, settings]);
}
