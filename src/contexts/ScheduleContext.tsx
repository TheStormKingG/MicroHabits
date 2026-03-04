import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { JSX } from 'react';
import type { SlotDefinition, DayRecord, SlotCompletion, AppSettings } from '../types';
import defaultScheduleRaw from '../data/default_schedule.json';
import { getDayRecord, upsertDayRecord, getSettings, saveSettings } from '../db/database';
import { todayISO } from '../utils/completion';
import { scheduleNotificationsForToday } from '../utils/notifications';
import { pushDayRecord, pushSettings } from '../lib/syncService';
import { useAuth } from './AuthContext';

const defaultSchedule = defaultScheduleRaw as SlotDefinition[];

interface ScheduleContextValue {
  slots: SlotDefinition[];
  dayRecord: DayRecord | null;
  settings: AppSettings | null;
  isLoading: boolean;
  toggleSlot: (slotId: string) => Promise<void>;
  toggleSlotSay: (slotId: string) => Promise<void>;
  updateSlotNotes: (slotId: string, notes: string) => Promise<void>;
  updateSlotSay: (slotId: string, say: [string, string, string]) => Promise<void>;
  /** Update label, time, and/or doText of a slot. */
  updateSlotDefinition: (slotId: string, patch: Partial<Pick<SlotDefinition, 'label' | 'time' | 'doText'>>) => Promise<void>;
  updateSettings: (settings: AppSettings) => Promise<void>;
  refresh: () => Promise<void>;
}

const ScheduleContext = createContext<ScheduleContextValue | null>(null);

export function ScheduleProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const { user } = useAuth();
  const [dayRecord, setDayRecord] = useState<DayRecord | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const today = useRef(todayISO());

  const slots = useMemo<SlotDefinition[]>(() => {
    if (!settings) return defaultSchedule;
    const custom = settings.customSlots;
    if (!custom || custom.length === 0) return defaultSchedule;
    // Merge: custom overrides default by id
    const customMap = new Map(custom.map((s) => [s.id, s]));
    return defaultSchedule.map((s) => customMap.get(s.id) ?? s);
  }, [settings]);

  const ensureDayRecord = useCallback(
    (existing: DayRecord | undefined): DayRecord => {
      if (existing) return existing;
      return {
        date: today.current,
        slots: {},
        todayTasks: [],
        tomorrowTasks: [],
      };
    },
    []
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [record, appSettings] = await Promise.all([
        getDayRecord(today.current),
        getSettings(),
      ]);
      setDayRecord(ensureDayRecord(record));
      setSettings(appSettings);
    } finally {
      setIsLoading(false);
    }
  }, [ensureDayRecord]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (settings?.notifications.enabled && dayRecord) {
      scheduleNotificationsForToday(slots, settings.notifications);
    }
  }, [settings, slots, dayRecord]);

  // Refresh when the page becomes visible again (e.g. user switched tabs)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [load]);

  const toggleSlot = useCallback(
    async (slotId: string) => {
      if (!dayRecord) return;
      const current = dayRecord.slots[slotId];
      const updated: SlotCompletion = {
        completed: !(current?.completed ?? false),
        sayDone:   current?.sayDone ?? false,
        notes:     current?.notes ?? '',
        completedAt: new Date().toISOString(),
      };
      const newRecord: DayRecord = {
        ...dayRecord,
        slots: { ...dayRecord.slots, [slotId]: updated },
      };
      setDayRecord(newRecord);
      await upsertDayRecord(newRecord);
      if (user) void pushDayRecord(user.id, newRecord);
    },
    [dayRecord, user]
  );

  const toggleSlotSay = useCallback(
    async (slotId: string) => {
      if (!dayRecord) return;
      const current = dayRecord.slots[slotId];
      const updated: SlotCompletion = {
        completed: current?.completed ?? false,
        sayDone:   !(current?.sayDone ?? false),
        notes:     current?.notes ?? '',
        completedAt: current?.completedAt,
      };
      const newRecord: DayRecord = {
        ...dayRecord,
        slots: { ...dayRecord.slots, [slotId]: updated },
      };
      setDayRecord(newRecord);
      await upsertDayRecord(newRecord);
      if (user) void pushDayRecord(user.id, newRecord);
    },
    [dayRecord, user]
  );

  const updateSlotNotes = useCallback(
    async (slotId: string, notes: string) => {
      if (!dayRecord) return;
      const current = dayRecord.slots[slotId] ?? { completed: false, sayDone: false, notes: '' };
      const newRecord: DayRecord = {
        ...dayRecord,
        slots: { ...dayRecord.slots, [slotId]: { ...current, notes } },
      };
      setDayRecord(newRecord);
      await upsertDayRecord(newRecord);
      if (user) void pushDayRecord(user.id, newRecord);
    },
    [dayRecord, user]
  );

  const updateSlotSay = useCallback(
    async (slotId: string, say: [string, string, string]) => {
      if (!settings) return;
      const existing = settings.customSlots.find((s) => s.id === slotId);
      const baseSlot = defaultSchedule.find((s) => s.id === slotId);
      if (!baseSlot) return;
      const updated: SlotDefinition = { ...(existing ?? baseSlot), say };
      const customSlots = [
        ...settings.customSlots.filter((s) => s.id !== slotId),
        updated,
      ];
      const newSettings: AppSettings = { ...settings, customSlots };
      setSettings(newSettings);
      await saveSettings(newSettings);
      if (user) void pushSettings(user.id, newSettings);
    },
    [settings, user]
  );

  const updateSlotDefinition = useCallback(
    async (slotId: string, patch: Partial<Pick<SlotDefinition, 'label' | 'time' | 'doText'>>) => {
      if (!settings) return;
      const existing = settings.customSlots.find((s) => s.id === slotId);
      const baseSlot = defaultSchedule.find((s) => s.id === slotId);
      if (!baseSlot) return;
      const updated: SlotDefinition = { ...(existing ?? baseSlot), ...patch };
      const customSlots = [
        ...settings.customSlots.filter((s) => s.id !== slotId),
        updated,
      ];
      const newSettings: AppSettings = { ...settings, customSlots };
      setSettings(newSettings);
      await saveSettings(newSettings);
      if (user) void pushSettings(user.id, newSettings);
    },
    [settings, user]
  );

  const updateSettings = useCallback(async (newSettings: AppSettings) => {
    setSettings(newSettings);
    await saveSettings(newSettings);
    if (user) void pushSettings(user.id, newSettings);
  }, [user]);

  const value = useMemo<ScheduleContextValue>(
    () => ({
      slots,
      dayRecord,
      settings,
      isLoading,
      toggleSlot,
      toggleSlotSay,
      updateSlotNotes,
      updateSlotSay,
      updateSlotDefinition,
      updateSettings,
      refresh: load,
    }),
    [slots, dayRecord, settings, isLoading, toggleSlot, toggleSlotSay, updateSlotNotes, updateSlotSay, updateSlotDefinition, updateSettings, load]
  );

  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>;
}

export function useSchedule(): ScheduleContextValue {
  const ctx = useContext(ScheduleContext);
  if (!ctx) throw new Error('useSchedule must be used within ScheduleProvider');
  return ctx;
}
