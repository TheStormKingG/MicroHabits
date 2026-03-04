import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { JSX } from 'react';
import { format, subDays } from 'date-fns';
import { Share2, Download, X } from 'lucide-react';
import { useSchedule } from '../contexts/ScheduleContext';
import { getDayRecordsRange, getAllDayRecords, getFirstDayRecord } from '../db/database';
import { buildCompletionSeries, todayISO } from '../utils/completion';
import { computeStreaks } from '../utils/streaks';
import { PageShell } from '../components/PageShell';
import { HabitWheel } from '../components/HabitWheel';
import { CompletionChart } from '../components/CompletionChart';
import { Spinner } from '../components/Spinner';
import type { DayRecord, StreakData } from '../types';
import wheelConfigRaw from '../data/wheel_config.json';
import chartConfigRaw from '../data/chart_config.json';
import type { WheelConfig, ChartConfig } from '../types';

const wheelConfig = wheelConfigRaw as WheelConfig;
const chartConfig = chartConfigRaw as ChartConfig;

export function DashboardPage(): JSX.Element {
  const { slots, dayRecord, isLoading } = useSchedule();
  const [records,        setRecords]        = useState<DayRecord[]>([]);
  const [allRecords,     setAllRecords]      = useState<DayRecord[]>([]);
  const [recordsLoading, setRecordsLoading]  = useState(true);
  const [appStartDate,   setAppStartDate]    = useState<string | null>(null);
  const [shareModal,     setShareModal]      = useState<'quarter' | 'halfYear' | 'year' | null>(null);
  const today = todayISO();

  const loadRecords = useCallback(async () => {
    const from = format(subDays(new Date(), 29), 'yyyy-MM-dd');
    const [range, all, first] = await Promise.all([
      getDayRecordsRange(from, today),
      getAllDayRecords(),
      getFirstDayRecord(),
    ]);
    setRecords(range);
    setAllRecords(all);
    setAppStartDate(first?.date ?? today);
    setRecordsLoading(false);
  }, [today]);

  useEffect(() => { void loadRecords(); }, [loadRecords]);

  // Merge live today record for real-time updates
  const mergedRecords = useMemo<DayRecord[]>(() => {
    if (!dayRecord) return records;
    return [...records.filter((r) => r.date !== today), dayRecord];
  }, [records, dayRecord, today]);

  const mergedAll = useMemo<DayRecord[]>(() => {
    if (!dayRecord) return allRecords;
    return [...allRecords.filter((r) => r.date !== today), dayRecord];
  }, [allRecords, dayRecord, today]);

  const completionData = buildCompletionSeries(mergedRecords, slots.length, chartConfig.rangeDays);

  const todayPct =
    slots.length > 0
      ? Math.round(
          (Object.values(dayRecord?.slots ?? {}).filter((s) => s.completed).length / slots.length) * 100
        )
      : 0;

  const streaks = useMemo<StreakData | null>(() => {
    if (!appStartDate || mergedAll.length === 0 || slots.length === 0) return null;
    return computeStreaks(mergedAll, slots, today, appStartDate);
  }, [mergedAll, slots, today, appStartDate]);

  const avg7d = calc7DayAvg(completionData);
  const isPageLoading = isLoading || recordsLoading;

  return (
    <PageShell title="Dashboard" subtitle={format(new Date(), 'EEEE, MMMM d, yyyy')}>
      {isPageLoading ? (
        <div className="flex justify-center items-center h-40"><Spinner /></div>
      ) : (
        <div className="space-y-6">
          {/* Today stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Today"   value={`${todayPct}%`}                 color="indigo" />
            <StatCard label="Streak"  value={`${streaks?.day ?? 0}d`}        color="orange" />
            <StatCard label="Avg 7d"  value={`${avg7d}%`}                    color="teal"   />
          </div>

          {/* Progress bar */}
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

          {/* Streaks section */}
          {streaks && <StreaksSection streaks={streaks} onShare={setShareModal} />}

          {/* Line chart */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <CompletionChart config={chartConfig} data={completionData} />
          </div>

          {/* Habit wheel */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">30-Day Habit Wheel</h3>
            <div className="flex justify-center">
              <HabitWheel config={wheelConfig} records={mergedRecords} appStartDate={appStartDate} />
            </div>
          </div>
        </div>
      )}

      {/* Share / Certificate modal */}
      {shareModal && streaks && (
        <AchievementModal
          type={shareModal}
          streaks={streaks}
          onClose={() => setShareModal(null)}
        />
      )}
    </PageShell>
  );
}

// ─── Streaks Section ──────────────────────────────────────────────────────────

const MILESTONES = [
  { key: 'week',     label: 'Week',      emoji: '📅', days: 7   },
  { key: 'month',    label: 'Month',     emoji: '🗓️',  days: 30  },
  { key: 'quarter',  label: 'Quarter',   emoji: '🏅', days: 91  },
  { key: 'halfYear', label: 'Half Year', emoji: '🥇', days: 182 },
  { key: 'year',     label: 'Year',      emoji: '🏆', days: 365 },
] as const;

type MilestoneKey = typeof MILESTONES[number]['key'];
type ShareType    = 'quarter' | 'halfYear' | 'year';

function StreaksSection({
  streaks,
  onShare,
}: {
  streaks: StreakData;
  onShare: (type: ShareType) => void;
}): JSX.Element {
  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Day streak header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-slate-700/40">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔥</span>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Current Streak</p>
            <p className="text-2xl font-black text-orange-400 leading-none">
              {streaks.day}
              <span className="text-sm font-semibold text-slate-400 ml-1">day{streaks.day !== 1 ? 's' : ''}</span>
            </p>
          </div>
        </div>
        {streaks.bestItemStreak && (
          <div className="text-right">
            <p className="text-[10px] text-slate-400">Best ★★★ streak</p>
            <p className="text-xs font-bold text-amber-400">{streaks.bestItemStreak.label}</p>
            <p className="text-[10px] text-slate-500">{streaks.bestItemStreak.days}d in a row</p>
          </div>
        )}
      </div>

      {/* Milestone chips */}
      <div className="px-4 py-3 grid grid-cols-5 gap-2">
        {MILESTONES.map((m) => {
          const count   = streaks[m.key as MilestoneKey] as number;
          const unlocked = count > 0;
          const isShare  = (m.key === 'quarter' || m.key === 'halfYear' || m.key === 'year') && unlocked;
          return (
            <button
              key={m.key}
              onClick={isShare ? () => onShare(m.key as ShareType) : undefined}
              disabled={!isShare}
              className={[
                'flex flex-col items-center rounded-xl py-2 px-1 transition-all',
                unlocked
                  ? 'bg-gradient-to-b from-amber-500/20 to-amber-900/20 border border-amber-500/40'
                  : 'bg-slate-800/60 border border-slate-700/40 opacity-50',
                isShare ? 'active:scale-95 cursor-pointer' : 'cursor-default',
              ].join(' ')}
            >
              <span className="text-lg leading-none">{unlocked ? m.emoji : '🔒'}</span>
              <span className={`text-base font-black leading-none mt-0.5 ${unlocked ? 'text-amber-400' : 'text-slate-600'}`}>
                {count}
              </span>
              <span className="text-[9px] text-slate-500 text-center leading-tight mt-0.5">{m.label}</span>
              {isShare && (
                <span className="text-[8px] text-indigo-400 mt-0.5">tap to share</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Progress to next milestone */}
      <NextMilestoneBar day={streaks.day} />
    </div>
  );
}

function NextMilestoneBar({ day }: { day: number }): JSX.Element {
  const milestones = [7, 30, 91, 182, 365];
  const next = milestones.find((m) => day < m) ?? 365;
  const prev = milestones[milestones.indexOf(next) - 1] ?? 0;
  const pct  = prev === next ? 100 : Math.round(((day - prev) / (next - prev)) * 100);
  const label = MILESTONES.find((m) => m.days === next)?.label ?? 'Year';

  return (
    <div className="px-4 pb-3">
      <div className="flex justify-between text-[10px] text-slate-500 mb-1">
        <span>Progress to next milestone</span>
        <span className="text-slate-400">{day}/{next} days → {label}</span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Achievement Modal (share / certificate) ───────────────────────────────

const ACHIEVEMENT_INFO = {
  quarter:  { emoji: '🏅', title: '1 Quarter Streak!', subtitle: '91 consecutive days of 100% habits.',   color: '#f59e0b' },
  halfYear: { emoji: '🥇', title: '½ Year Streak!',    subtitle: '182 consecutive days — incredible.',    color: '#f59e0b' },
  year:     { emoji: '🏆', title: '1 Year Streak!',    subtitle: '365 days. You\'ve built a new life.', color: '#fbbf24' },
};

function AchievementModal({
  type,
  streaks,
  onClose,
}: {
  type: ShareType;
  streaks: StreakData;
  onClose: () => void;
}): JSX.Element {
  const info        = ACHIEVEMENT_INFO[type];
  const cardRef     = useRef<HTMLDivElement>(null);
  const [copied,    setCopied]    = useState(false);

  const shareText = `${info.emoji} I've maintained a ${streaks.day}-day MicroHabits streak! ${info.title} #MicroHabits`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'MicroHabits Achievement', text: shareText, url: 'https://thestormkingg.github.io/MicroHabits/' });
      } catch {
        // user cancelled — no-op
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const canvas  = document.createElement('canvas');
    canvas.width  = 600;
    canvas.height = 400;
    const ctx     = canvas.getContext('2d')!;

    // Background
    const grad = ctx.createLinearGradient(0, 0, 600, 400);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 600, 400);

    // Border
    ctx.strokeStyle = info.color;
    ctx.lineWidth   = 4;
    ctx.strokeRect(16, 16, 568, 368);

    // Emoji
    ctx.font      = '80px serif';
    ctx.textAlign = 'center';
    ctx.fillText(info.emoji, 300, 130);

    // Title
    ctx.fillStyle = info.color;
    ctx.font      = 'bold 36px system-ui, sans-serif';
    ctx.fillText(info.title, 300, 190);

    // Subtitle
    ctx.fillStyle = '#94a3b8';
    ctx.font      = '20px system-ui, sans-serif';
    ctx.fillText(info.subtitle, 300, 230);

    // Days
    ctx.fillStyle = '#ffffff';
    ctx.font      = 'bold 48px system-ui, sans-serif';
    ctx.fillText(`${streaks.day} Days`, 300, 305);

    // Footer
    ctx.fillStyle = '#6366f1';
    ctx.font      = '16px system-ui, sans-serif';
    ctx.fillText('MicroHabits — thestormkingg.github.io/MicroHabits', 300, 365);

    const link  = document.createElement('a');
    link.href   = canvas.toDataURL('image/png');
    link.download = `microhabits-achievement-${type}.png`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={cardRef}
        className="relative w-full max-w-sm rounded-2xl border overflow-hidden shadow-2xl"
        style={{ background: 'linear-gradient(135deg, #0f172a, #1e1b4b)', borderColor: info.color + '60' }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Content */}
        <div className="px-6 py-8 text-center">
          <div className="text-6xl mb-3">{info.emoji}</div>
          <h2 className="text-2xl font-black mb-1" style={{ color: info.color }}>{info.title}</h2>
          <p className="text-sm text-slate-400 mb-2">{info.subtitle}</p>
          <p className="text-4xl font-black text-white mb-1">{streaks.day}</p>
          <p className="text-xs text-slate-500 mb-5">consecutive days</p>

          {type === 'year' && (
            <div className="mb-4 bg-indigo-900/40 border border-indigo-700/50 rounded-xl px-4 py-3 text-xs text-indigo-300 text-left">
              <p className="font-bold mb-1">🎯 Challenge Accepted</p>
              <p>You've truly built a habit lifestyle. Consider refreshing your habit list with 15 new growth challenges!</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-colors"
              style={{ background: info.color }}
            >
              <Share2 size={16} />
              {copied ? 'Copied!' : 'Share'}
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-slate-700 hover:bg-slate-600 text-white transition-colors"
            >
              <Download size={16} />
              Save Image
            </button>
          </div>
        </div>
      </div>
    </div>
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
    teal:   'text-teal-400   bg-teal-950/40   border-teal-800/40',
  };
  return (
    <div className={`rounded-xl border p-3 ${styles[color]}`}>
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className={`text-2xl font-bold ${styles[color].split(' ')[0]}`}>{value}</p>
    </div>
  );
}

function calc7DayAvg(data: import('../types').CompletionDataPoint[]): number {
  const last7 = data.slice(-7);
  if (last7.length === 0) return 0;
  return Math.round(last7.reduce((acc, d) => acc + d.completionPct, 0) / last7.length);
}
