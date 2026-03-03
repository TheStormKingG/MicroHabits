import { useState, useEffect, useCallback, useMemo } from 'react';
import type { JSX } from 'react';
import { format, subDays } from 'date-fns';
import { useSchedule } from '../contexts/ScheduleContext';
import { getDayRecordsRange, getFirstDayRecord } from '../db/database';
import { buildCompletionSeries, todayISO } from '../utils/completion';
import { PageShell } from '../components/PageShell';
import { HabitWheel } from '../components/HabitWheel';
import { CompletionChart } from '../components/CompletionChart';
import { Spinner } from '../components/Spinner';
import type { DayRecord } from '../types';
import wheelConfigRaw from '../data/wheel_config.json';
import chartConfigRaw from '../data/chart_config.json';
import type { WheelConfig, ChartConfig } from '../types';

const wheelConfig = wheelConfigRaw as WheelConfig;
const chartConfig = chartConfigRaw as ChartConfig;

export function DashboardPage(): JSX.Element {
  const { slots, dayRecord, isLoading } = useSchedule();
  const [records, setRecords] = useState<DayRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [appStartDate, setAppStartDate] = useState<string | null>(null);
  const today = todayISO();

  // Load the rolling 30-day window of records
  const loadRecords = useCallback(async () => {
    const from = format(subDays(new Date(), 29), 'yyyy-MM-dd');
    const recs = await getDayRecordsRange(from, today);
    setRecords(recs);
    setRecordsLoading(false);
  }, [today]);

  // Load the very first record ever to determine the app start date.
  // If no records exist yet (fresh install / after data reset), default to today
  // so that all prior days in the 30-day window are greyed out immediately.
  useEffect(() => {
    void getFirstDayRecord().then((first) => {
      setAppStartDate(first?.date ?? today);
    });
  }, [today]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  // Merge the live today record into the fetched window for real-time updates
  const mergedRecords = useMemo<DayRecord[]>(() => {
    if (!dayRecord) return records;
    const without = records.filter((r) => r.date !== today);
    return [...without, dayRecord];
  }, [records, dayRecord, today]);

  const completionData = buildCompletionSeries(mergedRecords, slots.length, chartConfig.rangeDays);

  const todayPct =
    slots.length > 0
      ? Math.round(
          (Object.values(dayRecord?.slots ?? {}).filter((s) => s.completed).length / slots.length) *
            100
        )
      : 0;

  const streak = calcStreak(mergedRecords, slots.length, today);
  const avg7d = calc7DayAvg(completionData);

  const isPageLoading = isLoading || recordsLoading;

  return (
    <PageShell title="Dashboard" subtitle={format(new Date(), 'EEEE, MMMM d, yyyy')}>
      {isPageLoading ? (
        <div className="flex justify-center items-center h-40">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Today stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Today" value={`${todayPct}%`} color="indigo" />
            <StatCard label="Streak" value={`${streak}d`} color="orange" />
            <StatCard label="Avg 7d" value={`${avg7d}%`} color="teal" />
          </div>

          {/* Today progress bar */}
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1.5">
              <span>Today's progress</span>
              <span>
                {Object.values(dayRecord?.slots ?? {}).filter((s) => s.completed).length}/
                {slots.length} habits
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={todayPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Today's completion: ${todayPct}%`}
              className="h-2 bg-slate-700 rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-400 rounded-full transition-all duration-500"
                style={{ width: `${todayPct}%` }}
              />
            </div>
          </div>

          {/* Line chart */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <CompletionChart config={chartConfig} data={completionData} />
          </div>

          {/* Habit wheel */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">30-Day Habit Wheel</h3>
            <div className="flex justify-center">
              <HabitWheel
                config={wheelConfig}
                records={mergedRecords}
                appStartDate={appStartDate}
              />
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: 'indigo' | 'orange' | 'teal';
}): JSX.Element {
  const styles: Record<string, string> = {
    indigo: 'text-indigo-400 bg-indigo-950/40 border-indigo-800/40',
    orange: 'text-orange-400 bg-orange-950/40 border-orange-800/40',
    teal: 'text-teal-400 bg-teal-950/40 border-teal-800/40',
  };
  return (
    <div className={`rounded-xl border p-3 ${styles[color]}`}>
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className={`text-2xl font-bold ${styles[color].split(' ')[0]}`}>{value}</p>
    </div>
  );
}

function calcStreak(records: DayRecord[], totalSlots: number, today: string): number {
  if (totalSlots === 0) return 0;
  let streak = 0;
  let checkDate = today;

  while (true) {
    const rec = records.find((r) => r.date === checkDate);
    if (!rec) break;
    const completed = Object.values(rec.slots).filter((s) => s.completed).length;
    if (completed / totalSlots < 0.5) break;
    streak++;
    checkDate = format(subDays(new Date(checkDate + 'T12:00:00'), 1), 'yyyy-MM-dd');
  }

  return streak;
}

function calc7DayAvg(data: import('../types').CompletionDataPoint[]): number {
  const last7 = data.slice(-7);
  if (last7.length === 0) return 0;
  const sum = last7.reduce((acc, d) => acc + d.completionPct, 0);
  return Math.round(sum / last7.length);
}
