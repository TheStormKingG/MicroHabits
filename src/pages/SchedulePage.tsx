import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { JSX } from 'react';
import { format } from 'date-fns';
import { X, Check, Plus, Trash2 } from 'lucide-react';
import { useSchedule } from '../contexts/ScheduleContext';
import { useTasks } from '../contexts/TasksContext';
import { SlotCard } from '../components/SlotCard';
import { Spinner } from '../components/Spinner';
import { TaskList, EveningReviewPanel } from '../components/TaskList';
import { AddSlotModal } from '../components/AddSlotModal';
import { updatePushSchedule } from '../lib/pushService';
import { getSlotStars, starCount } from '../utils/stars';
import type { SlotDefinition } from '../types';
import wheelConfigRaw from '../data/wheel_config.json';
import type { WheelConfig } from '../types';

// IDs that are part of the built-in default schedule
const DEFAULT_SLOT_IDS = new Set([
  'wake','brush','coffee','car1','park1','keynaan','car2','park2',
  'car3','ebrf','yard','read','water','meditate','sleep',
]);

const wheelConfig = wheelConfigRaw as WheelConfig;

// ─── Layout constants ─────────────────────────────────────────────────────────
const SLOT_SPACING  = 155;   // px between node centres (extra room for label + stars)
const PAD_TOP       = 28;
const PAD_BOTTOM    = 90;
const NODE_R        = 30;
const ACTIVE_NODE_R = 38;
const LABEL_GAP     = 16;    // px between node edge and nearest label edge

const TASK_PANEL_SLOTS = new Set(['coffee', 'water', 'meditate']);

const SLOT_COLORS: Record<string, string> = Object.fromEntries(
  wheelConfig.habits.map((h) => [h.id, h.color])
);

const SLOT_ICONS: Record<string, string> = {
  wake: '🌅', brush: '🪥', coffee: '☕', car1: '🚗', park1: '🏃',
  keynaan: '💙', car2: '🚗', park2: '🏃', car3: '🚗', ebrf: '💪',
  yard: '🌿', read: '📖', water: '💧', meditate: '🧘', sleep: '🌙',
};

const ZIGZAG_CYCLE = [50, 68, 80, 68, 50, 32, 20, 32];
function getXPct(i: number): number { return ZIGZAG_CYCLE[i % ZIGZAG_CYCLE.length]; }
function getNodeCY(i: number): number { return PAD_TOP + i * SLOT_SPACING + NODE_R; }

// ─── Colour helpers ───────────────────────────────────────────────────────────
function shiftHex(hex: string, amt: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp(((n >> 16) & 255) + amt);
  const g = clamp(((n >>  8) & 255) + amt);
  const b = clamp((n & 255)         + amt);
  return `rgb(${r},${g},${b})`;
}

interface NodeVisuals { bg: string; shadow: string; }

function getNodeVisuals(
  baseColor: string,
  isDone: boolean,
  isFuture: boolean,
  isNext: boolean,
  allStarsDone: boolean,
): NodeVisuals {
  const color = isFuture ? '#374151'
    : allStarsDone ? '#f59e0b'
    : isDone       ? '#22c55e'
    : baseColor;

  const light  = isFuture ? '#6b7280' : allStarsDone ? '#fcd34d' : isDone ? '#86efac' : shiftHex(color, +55);
  const dark   = isFuture ? '#1f2937' : allStarsDone ? '#d97706' : isDone ? '#16a34a' : shiftHex(color, -35);
  const depth  = isFuture ? '#0a0e17' : allStarsDone ? '#92400e' : isDone ? '#14532d' : shiftHex(color, -65);

  const bg     = `radial-gradient(circle at 36% 28%, ${light}, ${color} 55%, ${dark})`;
  const base3d = `0 6px 0 ${depth}, 0 8px 22px rgba(0,0,0,0.55)`;
  const ring   = isNext ? `, 0 0 0 5px #060b12, 0 0 0 11px ${color}cc` : '';

  return { bg, shadow: base3d + ring };
}

// ─── SVG bezier segment ───────────────────────────────────────────────────────
function buildSegment(x1: number, y1: number, x2: number, y2: number): string {
  const h = SLOT_SPACING * 0.46;
  return `M ${x1} ${y1} C ${x1} ${y1 + h}, ${x2} ${y2 - h}, ${x2} ${y2}`;
}

// ─── Star SVG (inline, tiny) ──────────────────────────────────────────────────
function StarIcon({ earned }: { earned: boolean }): JSX.Element {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true"
      fill={earned ? '#fbbf24' : '#1e293b'}
      stroke={earned ? '#f59e0b' : '#334155'}
      strokeWidth="1.5"
    >
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
    </svg>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function SchedulePage(): JSX.Element {
  const {
    slots, dayRecord, settings, isLoading,
    toggleSlot, toggleSlotSay, updateSlotNotes, updateSlotSay, updateSlotDefinition,
    addSlot, removeSlot,
  } = useSchedule();
  const [showAddModal, setShowAddModal] = useState(false);

  const {
    todayRecord, tomorrowRecord, isLoading: tasksLoading,
    addTodayTask, toggleTodayTask, deleteTodayTask, updateTodayTask,
    addTomorrowTask, toggleTomorrowTask, deleteTomorrowTask, updateTomorrowTask,
    saveEveningReview,
  } = useTasks();

  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  const [cw, setCw]   = useState(340);
  const hasDeepLinked = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setCw(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const deepLinkedSlotId = window.location.hash.replace('#', '') || null;
  useEffect(() => {
    if (deepLinkedSlotId && !hasDeepLinked.current && !isLoading) {
      setActiveSlotId(deepLinkedSlotId);
      hasDeepLinked.current = true;
    }
  }, [deepLinkedSlotId, isLoading]);

  const completedIds = new Set(
    Object.entries(dayRecord?.slots ?? {})
      .filter(([, v]) => v.completed)
      .map(([k]) => k)
  );

  // Pre-compute stars for every slot
  const allStars = useMemo(() => {
    const map = new Map<string, [boolean, boolean, boolean]>();
    for (const slot of slots) {
      const completion = dayRecord?.slots[slot.id];
      let ctx = {};
      if (slot.id === 'coffee')   ctx = { tasks: todayRecord?.todayTasks };
      if (slot.id === 'water')    ctx = { eveningReview: todayRecord?.eveningReview };
      if (slot.id === 'meditate') ctx = { tasks: tomorrowRecord?.tomorrowTasks };
      map.set(slot.id, getSlotStars(slot, completion, ctx));
    }
    return map;
  }, [slots, dayRecord, todayRecord, tomorrowRecord]);

  const completed  = completedIds.size;
  const total      = slots.length;
  const pct        = total > 0 ? Math.round((completed / total) * 100) : 0;
  const nextDueIdx = slots.findIndex((s) => !completedIds.has(s.id));
  const today      = format(new Date(), 'EEEE, MMMM d');
  const svgH       = PAD_TOP + slots.length * SLOT_SPACING + PAD_BOTTOM;

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleToggle = useCallback(
    (id: string) => () => void toggleSlot(id), [toggleSlot]
  );
  const handleSayDone = useCallback(
    (id: string) => () => void toggleSlotSay(id), [toggleSlotSay]
  );
  const handleNotes = useCallback(
    (id: string) => (notes: string) => void updateSlotNotes(id, notes), [updateSlotNotes]
  );
  const handleSay = useCallback(
    (id: string) => (say: [string, string, string]) => void updateSlotSay(id, say), [updateSlotSay]
  );
  const handleDefinition = useCallback(
    (id: string) => (patch: Partial<Pick<SlotDefinition, 'label' | 'time' | 'doText'>>) => {
      void updateSlotDefinition(id, patch).then(() => {
        if (settings?.notifications) void updatePushSchedule(slots, settings.notifications);
      });
    },
    [updateSlotDefinition, slots, settings]
  );

  const habitPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const getCustomPanel = useCallback(
    (slotId: string): { panel: JSX.Element; label: string } | undefined => {
      if (tasksLoading) return undefined;
      switch (slotId) {
        case 'coffee':
          return {
            label: "Today's Tasks",
            panel: (
              <TaskList
                tasks={todayRecord?.todayTasks ?? []}
                emptyMsg="Add today's first task or plan them the evening before."
                placeholder="Add a task for today…"
                onAdd={addTodayTask} onToggle={toggleTodayTask}
                onDelete={deleteTodayTask} onUpdate={updateTodayTask} compact
              />
            ),
          };
        case 'water':
          return {
            label: 'Evening Review',
            panel: (
              <EveningReviewPanel
                review={todayRecord?.eveningReview} tasks={todayRecord?.todayTasks ?? []}
                habitPct={habitPct} onSave={saveEveningReview} compact
              />
            ),
          };
        case 'meditate':
          return {
            label: "Tomorrow's Tasks",
            panel: (
              <TaskList
                tasks={tomorrowRecord?.tomorrowTasks ?? []}
                emptyMsg="Plan your tasks for tomorrow here."
                placeholder="Add a task for tomorrow…"
                onAdd={addTomorrowTask} onToggle={toggleTomorrowTask}
                onDelete={deleteTomorrowTask} onUpdate={updateTomorrowTask} compact
              />
            ),
          };
        default: return undefined;
      }
    },
    [
      tasksLoading, todayRecord, tomorrowRecord, habitPct,
      addTodayTask, toggleTodayTask, deleteTodayTask, updateTodayTask,
      addTomorrowTask, toggleTomorrowTask, deleteTomorrowTask, updateTomorrowTask,
      saveEveningReview,
    ]
  );

  const activeSlot = slots.find((s) => s.id === activeSlotId);
  const activeStars = activeSlot ? (allStars.get(activeSlot.id) ?? [false, false, false]) : undefined;

  return (
    <>
      <div className="flex flex-col h-full overflow-hidden">

        {/* ── Banner ───────────────────────────────────────────────────────── */}
        <div
          className="flex-shrink-0 px-4 pb-3 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800"
          style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Daily Schedule</p>
              <h1 className="text-base font-bold text-slate-100 leading-tight">{today}</h1>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-2xl font-black text-indigo-400">{pct}%</span>
              <span className="text-[10px] text-slate-500">{completed}/{total} done</span>
            </div>
          </div>
          <div className="h-2 bg-slate-700/60 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* ── Scrollable path ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {(isLoading || tasksLoading) ? (
            <div className="flex justify-center items-center h-40"><Spinner /></div>
          ) : (
            <div ref={containerRef} className="relative mx-auto" style={{ height: svgH, maxWidth: 480 }}>

              {/* SVG connecting path */}
              <svg viewBox={`0 0 ${cw} ${svgH}`} width={cw} height={svgH} className="absolute inset-0 pointer-events-none">
                {slots.slice(0, -1).map((slot, i) => {
                  const x1 = cw * getXPct(i)     / 100;
                  const y1 = getNodeCY(i);
                  const x2 = cw * getXPct(i + 1) / 100;
                  const y2 = getNodeCY(i + 1);
                  const bothDone   = completedIds.has(slot.id) && completedIds.has(slots[i + 1].id);
                  const isFutureSeg = i >= nextDueIdx && nextDueIdx !== -1 && !bothDone;
                  return (
                    <path
                      key={slot.id}
                      d={buildSegment(x1, y1, x2, y2)}
                      stroke={bothDone ? '#22c55e' : isFutureSeg ? 'rgba(55,65,81,0.6)' : 'rgba(71,85,105,0.55)'}
                      strokeWidth={bothDone ? 7 : 5}
                      fill="none" strokeLinecap="round"
                    />
                  );
                })}
              </svg>

              {/* Nodes */}
              {slots.map((slot, i) => {
                const xPct     = getXPct(i);
                const xPx      = cw * xPct / 100;
                const isDone   = completedIds.has(slot.id);
                const isNext   = i === nextDueIdx;
                const isFuture = !isDone && nextDueIdx !== -1 && i > nextDueIdx;
                const r        = isNext ? ACTIVE_NODE_R : NODE_R;
                const yCtr     = getNodeCY(i);
                const yTop     = yCtr - r;
                const baseColor = SLOT_COLORS[slot.id] ?? '#6366f1';
                const stars    = allStars.get(slot.id) ?? [false, false, false];
                const earned   = starCount(stars);
                const allDone  = earned === 3;
                const { bg, shadow } = getNodeVisuals(baseColor, isDone, isFuture, isNext, allDone);
                const labelRight = xPct >= 50;

                // Label positioning: anchor the edge of the label to the edge of
                // the circle using `left` + optional `translateX(-100%)`.
                // This avoids depending on `cw` for right-side labels, which
                // could be stale on first render and cause overlap.
                const labelPos: React.CSSProperties = labelRight
                  ? {
                      // right-side node → label sits LEFT of circle
                      position: 'absolute',
                      left: xPx - r - LABEL_GAP,
                      top:  yCtr - 28,
                      transform: 'translateX(-100%)',
                      textAlign: 'right',
                      maxWidth: '44%',
                    }
                  : {
                      // left-side node → label sits RIGHT of circle
                      position: 'absolute',
                      left: xPx + r + LABEL_GAP,
                      top:  yCtr - 28,
                      textAlign: 'left',
                      maxWidth: '44%',
                    };

                return (
                  <div key={slot.id}>
                    {/* Pulse ring for active node */}
                    {isNext && (
                      <div
                        className="pulse-ring-anim absolute rounded-full pointer-events-none"
                        style={{ left: xPx - r - 10, top: yTop - 10, width: (r + 10) * 2, height: (r + 10) * 2, border: `3px solid ${baseColor}` }}
                      />
                    )}

                    {/* Circle — z-index 10 so it sits above the SVG path */}
                    <button
                      onClick={() => setActiveSlotId(activeSlotId === slot.id ? null : slot.id)}
                      aria-label={`${slot.label} at ${slot.time}`}
                      style={{
                        position: 'absolute', left: xPx - r, top: yTop,
                        width: r * 2, height: r * 2,
                        background: bg, boxShadow: shadow,
                        zIndex: 10,
                      }}
                      className={`rounded-full flex items-center justify-center transition-all duration-200 ${
                        activeSlotId === slot.id ? 'scale-110' : 'active:scale-95'
                      }`}
                    >
                      {/* Gloss highlight */}
                      <div
                        className="absolute rounded-full pointer-events-none"
                        style={{ top: '8%', left: '18%', width: '42%', height: '30%', background: 'rgba(255,255,255,0.18)', filter: 'blur(2px)' }}
                      />
                      {isDone ? (
                        <Check size={r > 32 ? 22 : 18} className="text-white relative" strokeWidth={3} />
                      ) : (
                        <span
                          className="relative select-none"
                          style={{ fontSize: r > 32 ? 22 : 17, opacity: isFuture ? 0.45 : 1, filter: isFuture ? 'grayscale(1)' : 'none' }}
                        >
                          {SLOT_ICONS[slot.id] ?? '⭐'}
                        </span>
                      )}
                    </button>

                    {/* Label + stars — positioned to the side, never behind the circle */}
                    <div style={labelPos}>
                      <p className="text-[10px] font-mono text-slate-500 leading-none mb-0.5">
                        {slot.time}
                      </p>
                      <p className={`text-sm font-bold leading-tight ${
                        isFuture ? 'text-slate-600' : isDone ? 'text-emerald-400' : isNext ? 'text-white' : 'text-slate-300'
                      }`}>
                        {slot.label}
                      </p>
                      <p className={`text-[10px] leading-tight line-clamp-2 mt-0.5 ${
                        isFuture ? 'text-slate-700' : 'text-slate-500'
                      }`}>
                        {slot.doText}
                      </p>
                      {/* Stars row — lives in the label, not below the circle */}
                      <div className={`flex gap-0.5 mt-1.5 ${labelRight ? 'justify-end' : 'justify-start'}`}>
                        {stars.map((e, si) => <StarIcon key={si} earned={e} />)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Slot detail bottom sheet ──────────────────────────────────────────── */}
      {activeSlot && (
        <SlotDetailSheet
          slot={activeSlot}
          completion={dayRecord?.slots[activeSlot.id]}
          stars={activeStars as [boolean, boolean, boolean]}
          onToggle={handleToggle(activeSlot.id)}
          onSayDone={handleSayDone(activeSlot.id)}
          onNotesChange={TASK_PANEL_SLOTS.has(activeSlot.id) ? undefined : handleNotes(activeSlot.id)}
          onSayChange={handleSay(activeSlot.id)}
          onDefinitionChange={handleDefinition(activeSlot.id)}
          customPanel={getCustomPanel(activeSlot.id)?.panel}
          customPanelLabel={getCustomPanel(activeSlot.id)?.label}
          isCustomSlot={!DEFAULT_SLOT_IDS.has(activeSlot.id)}
          onDeleteSlot={async () => {
            await removeSlot(activeSlot.id);
            setActiveSlotId(null);
          }}
          onClose={() => setActiveSlotId(null)}
        />
      )}

      {/* FAB — add new habit slot */}
      <button
        onClick={() => setShowAddModal(true)}
        aria-label="Add new habit slot"
        className="fixed z-40 right-4 flex items-center justify-center w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 shadow-lg shadow-indigo-900/50 transition-all"
        style={{ bottom: 'calc(72px + env(safe-area-inset-bottom) + 12px)' }}
      >
        <Plus size={22} className="text-white" />
      </button>

      {showAddModal && (
        <AddSlotModal
          onSave={(slot) => { void addSlot(slot); }}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </>
  );
}

// ─── Bottom sheet ─────────────────────────────────────────────────────────────
interface SheetProps {
  slot: SlotDefinition;
  completion?: { completed: boolean; sayDone: boolean; notes: string; completedAt?: string };
  stars?: [boolean, boolean, boolean];
  isCustomSlot?: boolean;
  onToggle: () => void;
  onSayDone?: () => void;
  onNotesChange?: (notes: string) => void;
  onSayChange: (say: [string, string, string]) => void;
  onDefinitionChange?: (patch: Partial<Pick<SlotDefinition, 'label' | 'time' | 'doText'>>) => void;
  customPanel?: JSX.Element;
  customPanelLabel?: string;
  onDeleteSlot?: () => void;
  onClose: () => void;
}

function SlotDetailSheet({
  slot, completion, stars, isCustomSlot, onToggle, onSayDone, onNotesChange, onSayChange,
  onDefinitionChange, customPanel, customPanelLabel, onDeleteSlot, onClose,
}: SheetProps): JSX.Element {
  const color = wheelConfig.habits.find((h) => h.id === slot.id)?.color ?? '#6366f1';

  // Prevent background scroll on iOS while sheet is open
  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.overflow  = 'hidden';
    document.body.style.position  = 'fixed';
    document.body.style.top       = `-${scrollY}px`;
    document.body.style.width     = '100%';
    return () => {
      document.body.style.overflow  = '';
      document.body.style.position  = '';
      const t = document.body.style.top;
      document.body.style.top       = '';
      window.scrollTo(0, parseInt(t || '0') * -1);
    };
  }, []);

  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        className="relative bg-slate-900 rounded-t-2xl shadow-2xl flex flex-col animate-slide-up"
        style={{ maxHeight: '88dvh' }}
      >
        {/* Sheet header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-700/60 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-xs font-mono text-slate-400">{slot.time}</span>
            <span className="text-base font-bold text-slate-100 truncate">{slot.label}</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {isCustomSlot && (
              confirmDelete ? (
                <>
                  <button
                    onClick={() => onDeleteSlot?.()}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-red-600 hover:bg-red-500 text-white transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  aria-label="Delete slot"
                  className="p-1.5 rounded-full text-red-500/70 hover:text-red-400 hover:bg-red-900/30 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              )
            )}
            <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>
        {/* Scrollable content — key fix for iOS */}
        <div
          className="flex-1 overflow-y-auto px-3 py-3"
          style={{
            WebkitOverflowScrolling: 'touch' as unknown as undefined,
            overscrollBehavior: 'contain',
          }}
        >
          <SlotCard
            slot={slot}
            completion={completion}
            stars={stars}
            onToggle={onToggle}
            onSayDone={onSayDone}
            onNotesChange={onNotesChange}
            onSayChange={onSayChange}
            onDefinitionChange={onDefinitionChange}
            customPanel={customPanel}
            customPanelLabel={customPanelLabel}
            defaultExpanded
          />
        </div>
      </div>
    </div>
  );
}
