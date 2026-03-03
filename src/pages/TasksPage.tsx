import type { JSX } from 'react';
import { format } from 'date-fns';
import { useTasks } from '../contexts/TasksContext';
import { PageShell } from '../components/PageShell';
import { Spinner } from '../components/Spinner';
import { TaskList } from '../components/TaskList';

export function TasksPage(): JSX.Element {
  const {
    todayRecord,
    isLoading,
    addTodayTask,
    toggleTodayTask,
    deleteTodayTask,
    updateTodayTask,
    todayDate,
  } = useTasks();

  const subtitle = format(new Date(todayDate + 'T12:00:00'), 'EEEE, MMMM d');

  const tasks = todayRecord?.todayTasks ?? [];
  const donePct =
    tasks.length > 0 ? Math.round((tasks.filter((t) => t.done).length / tasks.length) * 100) : 0;

  return (
    <PageShell
      title="Today's Tasks"
      subtitle={subtitle}
      action={
        tasks.length > 0 ? (
          <span className="text-lg font-bold text-indigo-400">{donePct}%</span>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Hint about the workflow */}
          <p className="text-xs text-slate-500 leading-relaxed bg-slate-800/40 rounded-lg px-3 py-2.5 border border-slate-700/40">
            <span className="text-slate-400 font-medium">Tip:</span> Plan tomorrow's tasks tonight
            in the <span className="text-indigo-400">Meditate (21:00)</span> slot — they'll appear
            here automatically the next morning. Review them at{' '}
            <span className="text-indigo-400">Coffee (06:00)</span>.
          </p>

          <TaskList
            tasks={tasks}
            emptyMsg="No tasks for today yet. Add one here, or plan them the evening before via the Meditate slot in your Schedule."
            placeholder="Add a task for today…"
            onAdd={addTodayTask}
            onToggle={toggleTodayTask}
            onDelete={deleteTodayTask}
            onUpdate={updateTodayTask}
          />
        </div>
      )}
    </PageShell>
  );
}
