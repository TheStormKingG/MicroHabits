import Dexie, { type Table } from 'dexie';
import type { DayRecord, AppSettings } from '../types';

const DEFAULT_SETTINGS: AppSettings = {
  notifications: {
    enabled: false,
    minutesBefore: 5,
    permission: 'default',
  },
  customSlots: [],
  theme: 'dark',
};

export class MicroHabitsDB extends Dexie {
  dayRecords!: Table<DayRecord, string>;
  settings!: Table<{ key: string; value: AppSettings }, string>;

  constructor() {
    super('MicroHabitsDB');

    this.version(1).stores({
      dayRecords: 'date',
      settings: 'key',
    });
  }
}

export const db = new MicroHabitsDB();

// ─── Day Record helpers ───────────────────────────────────────────────────────

export async function getDayRecord(date: string): Promise<DayRecord | undefined> {
  return db.dayRecords.get(date);
}

export async function upsertDayRecord(record: DayRecord): Promise<void> {
  await db.dayRecords.put(record);
}

export async function getDayRecordsRange(
  fromDate: string,
  toDate: string
): Promise<DayRecord[]> {
  return db.dayRecords
    .where('date')
    .between(fromDate, toDate, true, true)
    .toArray();
}

export async function getAllDayRecords(): Promise<DayRecord[]> {
  return db.dayRecords.toArray();
}

/** Returns the earliest DayRecord ever stored (chronologically first). */
export async function getFirstDayRecord(): Promise<DayRecord | undefined> {
  return db.dayRecords.orderBy('date').first();
}

// ─── Settings helpers ─────────────────────────────────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  const row = await db.settings.get('app');
  return row?.value ?? DEFAULT_SETTINGS;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await db.settings.put({ key: 'app', value: settings });
}

// ─── Export / Import ──────────────────────────────────────────────────────────

export async function exportAllData(): Promise<{ dayRecords: DayRecord[]; appSettings: AppSettings }> {
  const [dayRecords, appSettings] = await Promise.all([
    getAllDayRecords(),
    getSettings(),
  ]);
  return { dayRecords, appSettings };
}

export async function importAllData(
  dayRecords: DayRecord[],
  appSettings: AppSettings
): Promise<void> {
  await db.transaction('rw', db.dayRecords, db.settings, async () => {
    await db.dayRecords.bulkPut(dayRecords);
    await db.settings.put({ key: 'app', value: appSettings });
  });
}

export async function deleteAllData(): Promise<void> {
  await db.transaction('rw', db.dayRecords, db.settings, async () => {
    await db.dayRecords.clear();
    await db.settings.clear();
  });
}
