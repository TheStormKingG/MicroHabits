import { useMemo } from 'react';
import type { JSX } from 'react';
import { format, subDays, startOfDay } from 'date-fns';
import type { WheelConfig, DayRecord } from '../types';
import { computeSegmentPath, computeDayLabelPosition, degToRad } from '../utils/wheelMath';

interface Props {
  config: WheelConfig;
  records: DayRecord[];
  /** YYYY-MM-DD of the very first day the app was used. Dates before this are greyed out. */
  appStartDate?: string | null;
  referenceDate?: Date;
}

// Slightly larger viewbox to accommodate the arrow indicators outside the day-label ring
const VIEWBOX_SIZE = 470;
const CX = VIEWBOX_SIZE / 2;  // 235
const CY = VIEWBOX_SIZE / 2;  // 235

const INACTIVE_OPACITY = 0.18;
const ACTIVE_OPACITY = 0.92;
const PRE_START_OPACITY = 0.06; // segments before the app start date
const PRE_START_COLOR = '#475569'; // slate-600

// Arrow geometry: tip points inward (toward the ring), base is at the outer edge
const ARROW_TIP_RADIUS = 202;   // inner point (near the day labels)
const ARROW_BASE_RADIUS = 225;  // outer base (toward SVG edge)
const ARROW_HALF_ANGLE_DEG = 4; // half-width in degrees

/** Compute SVG polygon points for a radial arrow indicator at a given day index. */
function computeArrowPoints(
  config: WheelConfig,
  dayIndex: number
): string {
  const sliceDeg = 360 / config.daysInView;
  const midDeg = config.startAngleDeg + (dayIndex + 0.5) * sliceDeg;
  const midRad = degToRad(midDeg);
  const halfRad = degToRad(ARROW_HALF_ANGLE_DEG);

  const tipX = CX + ARROW_TIP_RADIUS * Math.cos(midRad);
  const tipY = CY + ARROW_TIP_RADIUS * Math.sin(midRad);
  const w1X = CX + ARROW_BASE_RADIUS * Math.cos(midRad - halfRad);
  const w1Y = CY + ARROW_BASE_RADIUS * Math.sin(midRad - halfRad);
  const w2X = CX + ARROW_BASE_RADIUS * Math.cos(midRad + halfRad);
  const w2Y = CY + ARROW_BASE_RADIUS * Math.sin(midRad + halfRad);

  return `${tipX},${tipY} ${w1X},${w1Y} ${w2X},${w2Y}`;
}

export function HabitWheel({
  config,
  records,
  appStartDate,
  referenceDate = new Date(),
}: Props): JSX.Element {
  const todayISO = format(referenceDate, 'yyyy-MM-dd');

  // Build completion map: date → Set of completed habitIds
  const completionMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const record of records) {
      const completed = new Set<string>();
      for (const [habitId, slot] of Object.entries(record.slots)) {
        if (slot.completed) completed.add(habitId);
      }
      map.set(record.date, completed);
    }
    return map;
  }, [records]);

  // Build ordered array of dates: oldest (index 0 = "day 1") → newest (index 29 = "day 30" = today)
  const dates = useMemo(() => {
    const arr: string[] = [];
    for (let i = config.daysInView - 1; i >= 0; i--) {
      const d = startOfDay(subDays(referenceDate, i));
      arr.push(format(d, 'yyyy-MM-dd'));
    }
    return arr;
  }, [config.daysInView, referenceDate]);

  // Find the index of today and of appStartDate within the visible 30-day window
  const todayIndex = dates.indexOf(todayISO);
  const startIndex = appStartDate ? dates.indexOf(appStartDate) : -1;

  return (
    <div className="relative w-full" style={{ maxWidth: VIEWBOX_SIZE }}>
      <svg
        viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
        className="w-full h-auto select-none"
        aria-label="30-day habit wheel. Red arrow marks today; green arrow marks start of tracking."
        role="img"
      >
        {/* Background centre circle */}
        <circle cx={CX} cy={CY} r={config.innerRadius - 4} fill="#0f172a" />

        {/* ── Segments ── */}
        {config.habits.map((habit, habitIndex) =>
          dates.map((date, dayIndex) => {
            const { path } = computeSegmentPath(config, dayIndex, habitIndex, CX, CY);

            // Dates strictly before the tracked start date → greyed out
            const isPreStart = appStartDate != null && date < appStartDate;
            if (isPreStart) {
              return (
                <path
                  key={`${habit.id}-${date}`}
                  d={path}
                  fill={PRE_START_COLOR}
                  fillOpacity={PRE_START_OPACITY}
                  stroke="#0f172a"
                  strokeWidth={0.5}
                  aria-hidden="true"
                />
              );
            }

            const completed = completionMap.get(date)?.has(habit.id) ?? false;
            return (
              <path
                key={`${habit.id}-${date}`}
                d={path}
                fill={habit.color}
                fillOpacity={completed ? ACTIVE_OPACITY : INACTIVE_OPACITY}
                stroke="#0f172a"
                strokeWidth={0.5}
                aria-label={`${habit.label} on ${format(new Date(date + 'T12:00:00'), 'MMM d')}: ${completed ? 'completed' : 'not completed'}`}
              />
            );
          })
        )}

        {/* ── Day number labels (actual calendar day-of-month) ── */}
        {dates.map((date, dayIndex) => {
          const pos = computeDayLabelPosition(config, dayIndex, CX, CY);
          // Show the real calendar day number (e.g. "3" for March 3) instead of window index
          const dayOfMonth = parseInt(format(new Date(date + 'T12:00:00'), 'd'), 10);
          const isToday = date === todayISO;
          const isPreStart = appStartDate != null && date < appStartDate;

          return (
            <text
              key={`label-${date}`}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={isToday ? 9 : 7.5}
              fontWeight={isToday ? 700 : 400}
              fill={isPreStart ? '#334155' : isToday ? '#a5b4fc' : '#64748b'}
              aria-hidden="true"
            >
              {dayOfMonth}
            </text>
          );
        })}

        {/* ── Today arrow (red) ── */}
        {todayIndex >= 0 && (
          <polygon
            points={computeArrowPoints(config, todayIndex)}
            fill="#ef4444"
            aria-label="Today"
          />
        )}

        {/* ── App-start arrow (green) ── */}
        {startIndex >= 0 && startIndex !== todayIndex && (
          <polygon
            points={computeArrowPoints(config, startIndex)}
            fill="#22c55e"
            aria-label="App start date"
          />
        )}

        {/* If start date is same as today, render a single combined arrow (blended as yellow) */}
        {startIndex >= 0 && startIndex === todayIndex && (
          <polygon
            points={computeArrowPoints(config, todayIndex)}
            fill="#ef4444"
            aria-label="Today (also app start)"
          />
        )}

        {/* ── Centre labels ── */}
        <text x={CX} y={CY - 10} textAnchor="middle" fontSize={13} fontWeight={700} fill="#e2e8f0">
          MicroHabits
        </text>
        <text x={CX} y={CY + 8} textAnchor="middle" fontSize={9} fill="#64748b">
          {format(referenceDate, 'MMMM yyyy')}
        </text>
      </svg>

      {/* ── Arrow legend ── */}
      <div className="flex items-center justify-center gap-5 mt-2 mb-3">
        <div className="flex items-center gap-1.5">
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <polygon points="5,0 0,10 10,10" fill="#ef4444" />
          </svg>
          <span className="text-[10px] text-slate-400">Today ({format(referenceDate, 'MMM d')})</span>
        </div>
        {appStartDate && (
          <div className="flex items-center gap-1.5">
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
              <polygon points="5,0 0,10 10,10" fill="#22c55e" />
            </svg>
            <span className="text-[10px] text-slate-400">
              Start ({format(new Date(appStartDate + 'T12:00:00'), 'MMM d')})
            </span>
          </div>
        )}
      </div>

      {/* ── Habit colour legend ── */}
      <div className="grid grid-cols-3 gap-x-2 gap-y-1.5">
        {config.habits.map((habit) => (
          <div key={habit.id} className="flex items-center gap-1.5">
            <span
              className="flex-shrink-0 w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: habit.color }}
              aria-hidden="true"
            />
            <span className="text-[10px] text-slate-400 truncate">{habit.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
