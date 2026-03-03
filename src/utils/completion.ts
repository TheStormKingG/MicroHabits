import type { DayRecord, CompletionDataPoint } from '../types';
import { format, parseISO, subDays } from 'date-fns';

export function calcDayCompletionPct(record: DayRecord, totalSlots: number): number {
  if (totalSlots === 0) return 0;
  const completed = Object.values(record.slots).filter((s) => s.completed).length;
  return Math.round((completed / totalSlots) * 100);
}

export function buildCompletionSeries(
  records: DayRecord[],
  totalSlots: number,
  rangeDays: number,
  referenceDate: Date = new Date()
): CompletionDataPoint[] {
  const recordMap = new Map(records.map((r) => [r.date, r]));
  const points: CompletionDataPoint[] = [];

  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = subDays(referenceDate, i);
    const iso = format(d, 'yyyy-MM-dd');
    const displayDate = format(d, 'MMM d');
    const record = recordMap.get(iso);
    const pct = record ? calcDayCompletionPct(record, totalSlots) : 0;
    points.push({ date: displayDate, isoDate: iso, completionPct: pct });
  }

  return points;
}

/** Returns YYYY-MM-DD for today */
export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/** Parses a YYYY-MM-DD string to a Date object (UTC-safe) */
export function parseDate(iso: string): Date {
  return parseISO(iso);
}
