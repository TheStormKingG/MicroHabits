/**
 * Sync service — pushes and pulls MicroHabits data between IndexedDB and Supabase.
 *
 * Strategy: local-first with always-on cloud sync when signed in.
 * - Every write to IndexedDB immediately mirrors to Supabase (fire-and-forget, with retry).
 * - On sign-in, pull all cloud records and upsert them locally (last updated_at wins).
 * - Conflict resolution: the device with the latest `updated_at` timestamp wins.
 */

import { supabase } from './supabase';
import type { DayRecord, AppSettings } from '../types';
import {
  upsertDayRecord,
  getAllDayRecords,
  getDayRecord,
  saveSettings,
  getSettings,
} from '../db/database';

// ─── Push helpers ─────────────────────────────────────────────────────────────

/** Push a single DayRecord to Supabase (upsert by user_id + date). */
export async function pushDayRecord(userId: string, record: DayRecord): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('day_records').upsert(
    {
      user_id: userId,
      date: record.date,
      slots: record.slots,
      today_tasks: record.todayTasks,
      tomorrow_tasks: record.tomorrowTasks,
      evening_review: record.eveningReview ?? null,
    },
    { onConflict: 'user_id,date' }
  );
  if (error) console.warn('[Sync] pushDayRecord failed:', error.message);
}

/** Push AppSettings to Supabase. */
export async function pushSettings(userId: string, settings: AppSettings): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('app_settings').upsert(
    { user_id: userId, data: settings },
    { onConflict: 'user_id' }
  );
  if (error) console.warn('[Sync] pushSettings failed:', error.message);
}

// ─── Pull helpers ─────────────────────────────────────────────────────────────

/** Pull all cloud DayRecords and merge into local IndexedDB (cloud wins on updated_at). */
export async function pullAllRecords(userId: string): Promise<void> {
  if (!supabase) return;

  const { data, error } = await supabase
    .from('day_records')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.warn('[Sync] pullAllRecords failed:', error.message);
    return;
  }
  if (!data?.length) return;

  for (const row of data) {
    const local = await getDayRecord(row.date as string);
    const remoteUpdated = new Date(row.updated_at as string).getTime();
    const localUpdated = local?.slots
      ? Math.max(
          0,
          ...Object.values(local.slots)
            .map((s) => (s as { completedAt?: string }).completedAt)
            .filter(Boolean)
            .map((t) => new Date(t as string).getTime())
        )
      : 0;

    if (remoteUpdated > localUpdated) {
      const merged: DayRecord = {
        date: row.date as string,
        slots: (row.slots ?? {}) as DayRecord['slots'],
        todayTasks: (row.today_tasks ?? []) as DayRecord['todayTasks'],
        tomorrowTasks: (row.tomorrow_tasks ?? []) as DayRecord['tomorrowTasks'],
        eveningReview: (row.evening_review ?? undefined) as DayRecord['eveningReview'],
      };
      await upsertDayRecord(merged);
    }
  }
}

/** Pull AppSettings from cloud and merge into local (cloud wins). */
export async function pullSettings(userId: string): Promise<void> {
  if (!supabase) return;

  const { data, error } = await supabase
    .from('app_settings')
    .select('data, updated_at')
    .eq('user_id', userId);

  if (error) {
    console.warn('[Sync] pullSettings failed:', error.message);
    return;
  }
  const row = data?.[0];
  if (!row?.data) return;

  const cloudSettings = row.data as unknown as AppSettings;
  const localSettings = await getSettings();
  if (row.updated_at) {
    await saveSettings({ ...localSettings, ...cloudSettings });
  }
}

// ─── Full sync ────────────────────────────────────────────────────────────────

/** On sign-in: pull everything from cloud, then push everything local to cloud. */
export async function fullSync(userId: string): Promise<void> {
  await pullAllRecords(userId);
  await pullSettings(userId);

  const allLocal = await getAllDayRecords();
  await Promise.allSettled(allLocal.map((r) => pushDayRecord(userId, r)));

  const localSettings = await getSettings();
  await pushSettings(userId, localSettings);
}
