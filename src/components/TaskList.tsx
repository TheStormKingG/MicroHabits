/**
 * Shared task-list components used by both TasksPage and inline slot panels.
 */
import { useState, useRef } from 'react';
import type { JSX, KeyboardEvent } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import type { TaskItem, EveningReview } from '../types';

// ─── TaskRow ──────────────────────────────────────────────────────────────────

interface TaskRowProps {
  task: TaskItem;
  onToggle: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, text: string) => Promise<void>;
  compact?: boolean;
}

export function TaskRow({ task, onToggle, onDelete, onUpdate, compact }: TaskRowProps): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.text);

  const handleBlur = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== task.text) void onUpdate(task.id, trimmed);
    setEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleBlur();
    if (e.key === 'Escape') { setDraft(task.text); setEditing(false); }
  };

  const pad = compact ? 'p-2' : 'p-2.5';

  return (
    <li
      className={`flex items-start gap-2 ${pad} rounded-lg border transition-colors ${
        task.done
          ? 'bg-slate-800/30 border-slate-700/30'
          : 'bg-slate-800/60 border-slate-700/50'
      }`}
    >
      <button
        onClick={() => void onToggle(task.id)}
        aria-pressed={task.done}
        aria-label={`${task.done ? 'Uncheck' : 'Check'} task: ${task.text}`}
        className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
          task.done
            ? 'bg-indigo-500 border-indigo-500 text-white'
            : 'border-slate-500 hover:border-indigo-400'
        }`}
      >
        {task.done && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
            <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full bg-slate-700 border border-indigo-500 rounded px-1.5 py-0.5 text-sm text-slate-200 focus:outline-none"
            aria-label={`Edit task: ${task.text}`}
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className={`text-sm text-left w-full leading-snug ${
              task.done ? 'line-through text-slate-500' : 'text-slate-200'
            }`}
            aria-label={`Edit task: ${task.text}`}
          >
            {task.text}
          </button>
        )}
      </div>

      <button
        onClick={() => void onDelete(task.id)}
        aria-label={`Delete task: ${task.text}`}
        className="flex-shrink-0 p-1 text-slate-600 hover:text-red-400 transition-colors"
      >
        <Trash2 size={13} aria-hidden="true" />
      </button>
    </li>
  );
}

// ─── CompletedSection ─────────────────────────────────────────────────────────

interface CompletedSectionProps {
  tasks: TaskItem[];
  onToggle: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, text: string) => Promise<void>;
  compact?: boolean;
}

export function CompletedSection({ tasks, onToggle, onDelete, onUpdate, compact }: CompletedSectionProps): JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors py-1"
        aria-expanded={open}
      >
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        Completed ({tasks.length})
      </button>
      {open && (
        <ul className="space-y-1.5 mt-1.5">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} onUpdate={onUpdate} compact={compact} />
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── TaskList ─────────────────────────────────────────────────────────────────

interface TaskListProps {
  tasks: TaskItem[];
  emptyMsg?: string;
  placeholder?: string;
  onAdd: (text: string) => Promise<void>;
  onToggle: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, text: string) => Promise<void>;
  compact?: boolean;
}

export function TaskList({
  tasks,
  emptyMsg = 'No tasks yet.',
  placeholder = 'Add a task…',
  onAdd,
  onToggle,
  onDelete,
  onUpdate,
  compact,
}: TaskListProps): JSX.Element {
  const [newText, setNewText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = async () => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    setNewText('');
    await onAdd(trimmed);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') void handleAdd();
  };

  const doneTasks = tasks.filter((t) => t.done);
  const pendingTasks = tasks.filter((t) => !t.done);
  const pct = tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0;

  const gap = compact ? 'space-y-2' : 'space-y-3';

  return (
    <div className={gap}>
      {/* Progress bar */}
      {tasks.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 tabular-nums flex-shrink-0">
            {doneTasks.length}/{tasks.length}
          </span>
        </div>
      )}

      {/* Add input */}
      <div className="flex gap-1.5">
        <input
          ref={inputRef}
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="New task"
          className="flex-1 bg-slate-700/80 border border-slate-600 rounded-lg px-2.5 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          onClick={() => void handleAdd()}
          disabled={!newText.trim()}
          aria-label="Add task"
          className="flex-shrink-0 p-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>

      {/* List */}
      {tasks.length === 0 ? (
        <p className="text-xs text-slate-500 py-2">{emptyMsg}</p>
      ) : (
        <ul className="space-y-1.5" role="list">
          {pendingTasks.map((task) => (
            <TaskRow key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} onUpdate={onUpdate} compact={compact} />
          ))}
          {doneTasks.length > 0 && (
            <li>
              <CompletedSection
                tasks={doneTasks}
                onToggle={onToggle}
                onDelete={onDelete}
                onUpdate={onUpdate}
                compact={compact}
              />
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

// ─── EveningReviewPanel ───────────────────────────────────────────────────────

interface ReviewPanelProps {
  review?: EveningReview;
  tasks: TaskItem[];
  habitPct: number;
  onSave: (r: Omit<EveningReview, 'completedAt'>) => Promise<void>;
  compact?: boolean;
}

export function EveningReviewPanel({ review, tasks, habitPct, onSave, compact }: ReviewPanelProps): JSX.Element {
  const doneTasks = tasks.filter((t) => t.done).length;
  const taskPct = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;

  const [notes, setNotes] = useState(review?.notes ?? '');
  const [blockers, setBlockers] = useState(review?.blockers ?? '');
  const [saved, setSaved] = useState(!!review?.completedAt);

  const handleSave = async () => {
    await onSave({ donePercent: taskPct, notes, blockers });
    setSaved(true);
  };

  const rows = compact ? 2 : 3;

  return (
    <div className="space-y-3">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-indigo-800/40 bg-indigo-950/30 p-2.5">
          <p className="text-[10px] text-slate-400">Tasks done</p>
          <p className="text-xl font-bold text-indigo-400">{taskPct}%</p>
          <p className="text-[10px] text-slate-500">{doneTasks}/{tasks.length}</p>
        </div>
        <div className="rounded-lg border border-green-800/40 bg-green-950/30 p-2.5">
          <p className="text-[10px] text-slate-400">Habits done</p>
          <p className="text-xl font-bold text-green-400">{habitPct}%</p>
          <p className="text-[10px] text-slate-500">of schedule</p>
        </div>
      </div>

      <div>
        <label htmlFor="review-notes-inline" className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
          Reflection
        </label>
        <textarea
          id="review-notes-inline"
          value={notes}
          onChange={(e) => { setNotes(e.target.value); setSaved(false); }}
          placeholder="How did today go? What went well?"
          rows={rows}
          className="w-full bg-slate-700/60 border border-slate-600 rounded-lg px-2.5 py-1.5 text-sm text-slate-200 placeholder-slate-500 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label htmlFor="review-blockers-inline" className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
          What blocked me?
        </label>
        <textarea
          id="review-blockers-inline"
          value={blockers}
          onChange={(e) => { setBlockers(e.target.value); setSaved(false); }}
          placeholder="What got in the way?"
          rows={rows}
          className="w-full bg-slate-700/60 border border-slate-600 rounded-lg px-2.5 py-1.5 text-sm text-slate-200 placeholder-slate-500 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <button
        onClick={() => void handleSave()}
        className={`w-full py-2 rounded-lg text-xs font-semibold transition-all ${
          saved
            ? 'bg-green-800/50 text-green-300 border border-green-700'
            : 'bg-indigo-600 hover:bg-indigo-500 text-white'
        }`}
      >
        {saved ? '✓ Review saved' : 'Save Review'}
      </button>
    </div>
  );
}
