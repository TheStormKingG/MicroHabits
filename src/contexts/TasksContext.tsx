import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { JSX } from 'react';
import type { DayRecord, TaskItem, EveningReview } from '../types';
import { getDayRecord, upsertDayRecord } from '../db/database';
import { todayISO } from '../utils/completion';
import { format, addDays, subDays } from 'date-fns';

interface TasksContextValue {
  todayDate: string;
  tomorrowDate: string;
  todayRecord: DayRecord | null;
  tomorrowRecord: DayRecord | null;
  isLoading: boolean;
  addTodayTask: (text: string) => Promise<void>;
  toggleTodayTask: (id: string) => Promise<void>;
  deleteTodayTask: (id: string) => Promise<void>;
  updateTodayTask: (id: string, text: string) => Promise<void>;
  addTomorrowTask: (text: string) => Promise<void>;
  toggleTomorrowTask: (id: string) => Promise<void>;
  deleteTomorrowTask: (id: string) => Promise<void>;
  updateTomorrowTask: (id: string, text: string) => Promise<void>;
  saveEveningReview: (review: Omit<EveningReview, 'completedAt'>) => Promise<void>;
  refresh: () => Promise<void>;
}

const TasksContext = createContext<TasksContextValue | null>(null);

function emptyRecord(date: string): DayRecord {
  return { date, slots: {}, todayTasks: [], tomorrowTasks: [] };
}

function makeTaskItem(text: string): TaskItem {
  return {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text,
    done: false,
    createdAt: new Date().toISOString(),
  };
}

export function TasksProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const todayDate = todayISO();
  const tomorrowDate = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  const [todayRecord, setTodayRecord] = useState<DayRecord | null>(null);
  const [tomorrowRecord, setTomorrowRecord] = useState<DayRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [tRec, tmRec] = await Promise.all([
        getDayRecord(todayDate),
        getDayRecord(tomorrowDate),
      ]);

      let todayRec = tRec ?? emptyRecord(todayDate);

      // Auto-populate today's tasks from the previous evening's plan (yesterday's tomorrowTasks)
      // so that when you open Coffee in the morning you already see what you planned the night before.
      if (todayRec.todayTasks.length === 0) {
        const yesterdayDate = format(subDays(new Date(), 1), 'yyyy-MM-dd');
        const yesterdayRec = await getDayRecord(yesterdayDate);
        if (yesterdayRec?.tomorrowTasks && yesterdayRec.tomorrowTasks.length > 0) {
          todayRec = {
            ...todayRec,
            // Copy tasks with done reset to false so each day starts fresh
            todayTasks: yesterdayRec.tomorrowTasks.map((t) => ({ ...t, done: false })),
          };
          await upsertDayRecord(todayRec);
        }
      }

      setTodayRecord(todayRec);
      setTomorrowRecord(tmRec ?? emptyRecord(tomorrowDate));
    } finally {
      setIsLoading(false);
    }
  }, [todayDate, tomorrowDate]);

  useEffect(() => {
    void load();
  }, [load]);

  const mutateToday = useCallback(
    async (updater: (r: DayRecord) => DayRecord) => {
      const base = todayRecord ?? emptyRecord(todayDate);
      const updated = updater(base);
      setTodayRecord(updated);
      await upsertDayRecord(updated);
    },
    [todayDate, todayRecord]
  );

  const mutateTomorrow = useCallback(
    async (updater: (r: DayRecord) => DayRecord) => {
      const base = tomorrowRecord ?? emptyRecord(tomorrowDate);
      const updated = updater(base);
      setTomorrowRecord(updated);
      await upsertDayRecord(updated);
    },
    [tomorrowDate, tomorrowRecord]
  );

  const addTodayTask = useCallback(
    async (text: string) => {
      await mutateToday((r) => ({ ...r, todayTasks: [...r.todayTasks, makeTaskItem(text)] }));
    },
    [mutateToday]
  );

  const toggleTodayTask = useCallback(
    async (id: string) => {
      await mutateToday((r) => ({
        ...r,
        todayTasks: r.todayTasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
      }));
    },
    [mutateToday]
  );

  const deleteTodayTask = useCallback(
    async (id: string) => {
      await mutateToday((r) => ({ ...r, todayTasks: r.todayTasks.filter((t) => t.id !== id) }));
    },
    [mutateToday]
  );

  const updateTodayTask = useCallback(
    async (id: string, text: string) => {
      await mutateToday((r) => ({
        ...r,
        todayTasks: r.todayTasks.map((t) => (t.id === id ? { ...t, text } : t)),
      }));
    },
    [mutateToday]
  );

  const addTomorrowTask = useCallback(
    async (text: string) => {
      await mutateTomorrow((r) => ({
        ...r,
        tomorrowTasks: [...r.tomorrowTasks, makeTaskItem(text)],
      }));
    },
    [mutateTomorrow]
  );

  const toggleTomorrowTask = useCallback(
    async (id: string) => {
      await mutateTomorrow((r) => ({
        ...r,
        tomorrowTasks: r.tomorrowTasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
      }));
    },
    [mutateTomorrow]
  );

  const deleteTomorrowTask = useCallback(
    async (id: string) => {
      await mutateTomorrow((r) => ({
        ...r,
        tomorrowTasks: r.tomorrowTasks.filter((t) => t.id !== id),
      }));
    },
    [mutateTomorrow]
  );

  const updateTomorrowTask = useCallback(
    async (id: string, text: string) => {
      await mutateTomorrow((r) => ({
        ...r,
        tomorrowTasks: r.tomorrowTasks.map((t) => (t.id === id ? { ...t, text } : t)),
      }));
    },
    [mutateTomorrow]
  );

  const saveEveningReview = useCallback(
    async (review: Omit<EveningReview, 'completedAt'>) => {
      await mutateToday((r) => ({
        ...r,
        eveningReview: { ...review, completedAt: new Date().toISOString() },
      }));
    },
    [mutateToday]
  );

  const value = useMemo<TasksContextValue>(
    () => ({
      todayDate,
      tomorrowDate,
      todayRecord,
      tomorrowRecord,
      isLoading,
      addTodayTask,
      toggleTodayTask,
      deleteTodayTask,
      updateTodayTask,
      addTomorrowTask,
      toggleTomorrowTask,
      deleteTomorrowTask,
      updateTomorrowTask,
      saveEveningReview,
      refresh: load,
    }),
    [
      todayDate,
      tomorrowDate,
      todayRecord,
      tomorrowRecord,
      isLoading,
      addTodayTask,
      toggleTodayTask,
      deleteTodayTask,
      updateTodayTask,
      addTomorrowTask,
      toggleTomorrowTask,
      deleteTomorrowTask,
      updateTomorrowTask,
      saveEveningReview,
      load,
    ]
  );

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks(): TasksContextValue {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasks must be used within TasksProvider');
  return ctx;
}
