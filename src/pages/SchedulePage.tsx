import { useCallback } from 'react';
import type { JSX } from 'react';
import { format } from 'date-fns';
import { useSchedule } from '../contexts/ScheduleContext';
import { useTasks } from '../contexts/TasksContext';
import { PageShell } from '../components/PageShell';
import { SlotCard } from '../components/SlotCard';
import { Spinner } from '../components/Spinner';
import { TaskList, EveningReviewPanel } from '../components/TaskList';
import type { SlotDefinition } from '../types';

/**
 * Slots that embed a task panel instead of a plain notes textarea.
 * coffee   → today's task list (edit the day's plan)
 * water    → evening review
 * meditate → tomorrow's task list (plan for tomorrow)
 */
const TASK_PANEL_SLOTS = new Set(['coffee', 'water', 'meditate']);

export function SchedulePage(): JSX.Element {
  const {
    slots,
    dayRecord,
    isLoading,
    toggleSlot,
    updateSlotNotes,
    updateSlotSay,
  } = useSchedule();

  const {
    todayRecord,
    tomorrowRecord,
    isLoading: tasksLoading,
    addTodayTask,
    toggleTodayTask,
    deleteTodayTask,
    updateTodayTask,
    addTomorrowTask,
    toggleTomorrowTask,
    deleteTomorrowTask,
    updateTomorrowTask,
    saveEveningReview,
  } = useTasks();

  const completedHabitsCount = Object.values(dayRecord?.slots ?? {}).filter((s) => s.completed).length;
  const habitPct = slots.length > 0 ? Math.round((completedHabitsCount / slots.length) * 100) : 0;

  const completed = Object.values(dayRecord?.slots ?? {}).filter((s) => s.completed).length;
  const total = slots.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const today = format(new Date(), 'EEEE, MMMM d');

  const handleToggle = useCallback(
    (slotId: string) => () => void toggleSlot(slotId),
    [toggleSlot]
  );

  const handleNotes = useCallback(
    (slotId: string) => (notes: string) => void updateSlotNotes(slotId, notes),
    [updateSlotNotes]
  );

  const handleSay = useCallback(
    (slotId: string) => (say: [string, string, string]) => void updateSlotSay(slotId, say),
    [updateSlotSay]
  );

  /**
   * Returns the custom panel for a task-related slot, or undefined for regular slots.
   */
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
                emptyMsg="No tasks planned yet. Add today's first task or plan them the evening before in the Meditate slot."
                placeholder="Add a task for today…"
                onAdd={addTodayTask}
                onToggle={toggleTodayTask}
                onDelete={deleteTodayTask}
                onUpdate={updateTodayTask}
                compact
              />
            ),
          };

        case 'water':
          return {
            label: 'Evening Review',
            panel: (
              <EveningReviewPanel
                review={todayRecord?.eveningReview}
                tasks={todayRecord?.todayTasks ?? []}
                habitPct={habitPct}
                onSave={saveEveningReview}
                compact
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
                onAdd={addTomorrowTask}
                onToggle={toggleTomorrowTask}
                onDelete={deleteTomorrowTask}
                onUpdate={updateTomorrowTask}
                compact
              />
            ),
          };

        default:
          return undefined;
      }
    },
    [
      tasksLoading,
      todayRecord,
      tomorrowRecord,
      habitPct,
      addTodayTask,
      toggleTodayTask,
      deleteTodayTask,
      updateTodayTask,
      addTomorrowTask,
      toggleTomorrowTask,
      deleteTomorrowTask,
      updateTomorrowTask,
      saveEveningReview,
    ]
  );

  const pageLoading = isLoading || tasksLoading;

  return (
    <PageShell
      title="Daily Schedule"
      subtitle={today}
      action={
        <div className="text-right">
          <span className="text-lg font-bold text-indigo-400">{pct}%</span>
          <p className="text-[10px] text-slate-400 leading-none">
            {completed}/{total}
          </p>
        </div>
      }
    >
      {pageLoading ? (
        <div className="flex justify-center items-center h-40">
          <Spinner />
        </div>
      ) : (
        <>
          {/* Progress bar */}
          <div
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Daily completion: ${pct}%`}
            className="h-1.5 bg-slate-700 rounded-full overflow-hidden mb-4"
          >
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-green-400 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>

          <ul className="space-y-2.5" role="list" aria-label="Schedule slots">
            {slots.map((slot: SlotDefinition) => {
              const taskPanel = TASK_PANEL_SLOTS.has(slot.id) ? getCustomPanel(slot.id) : undefined;
              return (
                <li key={slot.id}>
                  <SlotCard
                    slot={slot}
                    completion={dayRecord?.slots[slot.id]}
                    onToggle={handleToggle(slot.id)}
                    onNotesChange={taskPanel ? undefined : handleNotes(slot.id)}
                    onSayChange={handleSay(slot.id)}
                    customPanel={taskPanel?.panel}
                    customPanelLabel={taskPanel?.label}
                  />
                </li>
              );
            })}
          </ul>
        </>
      )}
    </PageShell>
  );
}
