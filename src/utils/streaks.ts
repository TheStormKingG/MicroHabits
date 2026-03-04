import { format } from 'date-fns';
import type { DayRecord, SlotDefinition, StreakData } from '../types';
import { countWords } from './stars';

function subDay(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  return format(d, 'yyyy-MM-dd');
}

function isDayFull(rec: DayRecord, total: number): boolean {
  if (total === 0) return false;
  return Object.values(rec.slots).filter((s) => s.completed).length >= total;
}

function slot3Stars(slotId: string, rec: DayRecord): boolean {
  const c = rec.slots[slotId];
  if (!c?.completed || !c.sayDone) return false;
  if (slotId === 'water') {
    const r = rec.eveningReview;
    return Boolean(r && countWords(r.notes ?? '') > 6 && countWords(r.blockers ?? '') > 6);
  }
  if (slotId === 'coffee')   return (rec.todayTasks   ?? []).length > 0;
  if (slotId === 'meditate') return (rec.tomorrowTasks ?? []).length > 0;
  return countWords(c.notes ?? '') > 6;
}

export function computeStreaks(
  allRecords: DayRecord[],
  slots: SlotDefinition[],
  today: string,
  appStartDate: string,
): StreakData {
  const total     = slots.length;
  const recordMap = new Map(allRecords.map((r) => [r.date, r]));

  // Current day streak — walk backwards from today
  let day       = 0;
  let checkDate = today;
  while (checkDate >= appStartDate) {
    const rec = recordMap.get(checkDate);
    if (!rec || !isDayFull(rec, total)) break;
    day++;
    checkDate = subDay(checkDate);
  }

  // Best item 3-star streak
  let bestItemStreak: StreakData['bestItemStreak'] = null;
  for (const slot of slots) {
    let streak = 0;
    let d = today;
    while (d >= appStartDate) {
      const rec = recordMap.get(d);
      if (!rec || !slot3Stars(slot.id, rec)) break;
      streak++;
      d = subDay(d);
    }
    if (streak > 0 && (!bestItemStreak || streak > bestItemStreak.days)) {
      bestItemStreak = { label: slot.label, days: streak };
    }
  }

  return {
    day,
    week:     Math.floor(day / 7),
    month:    Math.floor(day / 30),
    quarter:  Math.floor(day / 91),
    halfYear: Math.floor(day / 182),
    year:     Math.floor(day / 365),
    bestItemStreak,
  };
}
