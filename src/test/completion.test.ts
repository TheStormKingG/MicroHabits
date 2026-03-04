import { describe, it, expect } from 'vitest';
import { calcDayCompletionPct, buildCompletionSeries } from '../utils/completion';
import type { DayRecord } from '../types';

function makeRecord(date: string, completedIds: string[]): DayRecord {
  const slots: DayRecord['slots'] = {};
  for (const id of completedIds) {
    slots[id] = { completed: true, sayDone: false, notes: '' };
  }
  return { date, slots, todayTasks: [], tomorrowTasks: [] };
}

describe('calcDayCompletionPct', () => {
  it('returns 0 when totalSlots is 0', () => {
    const record = makeRecord('2025-01-01', []);
    expect(calcDayCompletionPct(record, 0)).toBe(0);
  });

  it('returns 0 when no slots are completed', () => {
    const record = makeRecord('2025-01-01', []);
    expect(calcDayCompletionPct(record, 10)).toBe(0);
  });

  it('returns 100 when all slots are completed', () => {
    const ids = Array.from({ length: 15 }, (_, i) => `slot-${i}`);
    const record = makeRecord('2025-01-01', ids);
    expect(calcDayCompletionPct(record, 15)).toBe(100);
  });

  it('calculates partial completion correctly', () => {
    const record = makeRecord('2025-01-01', ['a', 'b', 'c']);
    expect(calcDayCompletionPct(record, 10)).toBe(30);
  });

  it('rounds to nearest integer', () => {
    const record = makeRecord('2025-01-01', ['a']);
    // 1/3 = 33.33... → 33
    expect(calcDayCompletionPct(record, 3)).toBe(33);
  });

  it('counts only completed=true slots', () => {
    const record: DayRecord = {
      date: '2025-01-01',
      slots: {
        a: { completed: true, sayDone: false, notes: '' },
        b: { completed: false, sayDone: false, notes: '' },
        c: { completed: true, sayDone: false, notes: '' },
      },
      todayTasks: [],
      tomorrowTasks: [],
    };
    expect(calcDayCompletionPct(record, 4)).toBe(50);
  });
});

describe('buildCompletionSeries', () => {
  it('returns rangeDays data points', () => {
    const series = buildCompletionSeries([], 15, 30, new Date('2025-03-01'));
    expect(series).toHaveLength(30);
  });

  it('returns 0% for days with no records', () => {
    const series = buildCompletionSeries([], 15, 7, new Date('2025-03-01'));
    for (const pt of series) {
      expect(pt.completionPct).toBe(0);
    }
  });

  it('fills in correct completion for a matching date', () => {
    // Use local-time constructor to avoid UTC-offset timezone issues
    const refDate = new Date(2025, 2, 3); // March 3, 2025 local midnight
    const records = [makeRecord('2025-03-03', ['a', 'b', 'c', 'd', 'e'])];
    const series = buildCompletionSeries(records, 10, 3, refDate);
    const todayPt = series.find((p) => p.isoDate === '2025-03-03');
    expect(todayPt?.completionPct).toBe(50); // 5/10
  });

  it('orders points from oldest to newest', () => {
    const refDate = new Date(2025, 2, 3); // March 3, 2025 local midnight
    const series = buildCompletionSeries([], 10, 5, refDate);
    expect(series[0].isoDate).toBe('2025-02-27');
    expect(series[4].isoDate).toBe('2025-03-03');
  });
});
