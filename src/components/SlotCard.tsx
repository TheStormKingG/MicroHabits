import { useState } from 'react';
import type { JSX, ReactNode } from 'react';
import { ChevronDown, ChevronUp, Pencil, Save, X } from 'lucide-react';
import type { SlotDefinition, SlotCompletion } from '../types';
import { countWords } from '../utils/stars';

interface Props {
  slot: SlotDefinition;
  completion?: SlotCompletion;
  /** Toggle the "Do" completion */
  onToggle: () => void;
  /** Toggle the "Say" completion */
  onSayDone?: () => void;
  onNotesChange?: (notes: string) => void;
  onSayChange: (say: [string, string, string]) => void;
  onDefinitionChange?: (patch: Partial<Pick<SlotDefinition, 'label' | 'time' | 'doText'>>) => void;
  customPanel?: ReactNode;
  customPanelLabel?: string;
  defaultExpanded?: boolean;
  /**
   * Pre-computed star tuple [do, say, bonus].
   * Bonus (star 3) depends on external data so it must be supplied by the parent.
   * If omitted, star 3 is derived from notes word-count locally.
   */
  stars?: [boolean, boolean, boolean];
}

const SAY_LABELS = ['Physical', 'Mind', 'Goal'] as const;
const NOTES_WORD_GOAL = 6;

/** Gold star SVG icon */
function Star({ earned }: { earned: boolean }): JSX.Element {
  return (
    <svg
      width="18" height="18" viewBox="0 0 24 24"
      fill={earned ? '#fbbf24' : '#1e293b'}
      stroke={earned ? '#f59e0b' : '#334155'}
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
    </svg>
  );
}

/** Square checkbox with animated check */
function Checkbox({ checked, label, onToggle }: { checked: boolean; label: string; onToggle: () => void }): JSX.Element {
  return (
    <button
      onClick={onToggle}
      aria-pressed={checked}
      aria-label={label}
      className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all duration-200 ${
        checked
          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
          : 'bg-slate-700/60 border-slate-600 text-slate-400 hover:border-amber-500/40 hover:text-amber-400'
      }`}
    >
      <span
        className={`w-4 h-4 rounded flex items-center justify-center border-2 transition-all flex-shrink-0 ${
          checked ? 'bg-amber-500 border-amber-500' : 'border-slate-500'
        }`}
      >
        {checked && (
          <svg width="8" height="7" viewBox="0 0 8 7" fill="none" aria-hidden="true">
            <path d="M1 3.5L3 5.5L7 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        )}
      </span>
      {checked ? 'Done ✓' : 'Mark done'}
    </button>
  );
}

export function SlotCard({
  slot,
  completion,
  onToggle,
  onSayDone,
  onNotesChange,
  onSayChange,
  onDefinitionChange,
  customPanel,
  customPanelLabel,
  defaultExpanded = false,
  stars: starsProp,
}: Props): JSX.Element {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [editingSay, setEditingSay] = useState(false);
  const [sayDraft, setSayDraft] = useState<[string, string, string]>(slot.say);
  const [editingDef, setEditingDef] = useState(false);
  const [defDraft, setDefDraft] = useState({ label: slot.label, time: slot.time, doText: slot.doText });

  const isDone    = completion?.completed ?? false;
  const isSayDone = completion?.sayDone   ?? false;
  const notes     = completion?.notes ?? '';
  const wordCount = countWords(notes);

  // Resolve star-3 locally from notes if the parent didn't supply stars
  const star3Local = wordCount > NOTES_WORD_GOAL;
  const stars: [boolean, boolean, boolean] = starsProp ?? [isDone, isSayDone, star3Local];
  const earnedCount = stars.filter(Boolean).length;

  // ── Definition handlers ─────────────────────────────────────────────────────
  const handleDefEdit   = () => { setDefDraft({ label: slot.label, time: slot.time, doText: slot.doText }); setEditingDef(true); };
  const handleDefSave   = () => { onDefinitionChange?.(defDraft); setEditingDef(false); };
  const handleDefCancel = () => { setDefDraft({ label: slot.label, time: slot.time, doText: slot.doText }); setEditingDef(false); };

  // ── Say handlers ────────────────────────────────────────────────────────────
  const handleSaySave   = () => { onSayChange(sayDraft); setEditingSay(false); };
  const handleSayCancel = () => { setSayDraft(slot.say); setEditingSay(false); };

  return (
    <article
      className={`rounded-xl border transition-all duration-200 ${
        earnedCount === 3
          ? 'bg-amber-950/20 border-amber-700/30'
          : isDone
          ? 'bg-green-950/30 border-green-700/40'
          : 'bg-slate-800/60 border-slate-700/50'
      }`}
      aria-label={`${slot.label} at ${slot.time}`}
    >
      {/* ── Header ── */}
      <div className="flex items-start gap-3 p-3">
        {/* Time + Label + stars row */}
        <div className="flex-1 min-w-0">
          {editingDef ? (
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <input
                  type="time"
                  value={defDraft.time}
                  onChange={(e) => setDefDraft((d) => ({ ...d, time: e.target.value }))}
                  className="w-24 text-xs font-mono bg-slate-700 border border-slate-600 rounded-md px-2 py-1 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  aria-label="Slot time"
                />
                <input
                  type="text"
                  value={defDraft.label}
                  onChange={(e) => setDefDraft((d) => ({ ...d, label: e.target.value }))}
                  placeholder="Name"
                  className="flex-1 text-xs bg-slate-700 border border-slate-600 rounded-md px-2 py-1 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  aria-label="Slot name"
                />
              </div>
              <textarea
                value={defDraft.doText}
                onChange={(e) => setDefDraft((d) => ({ ...d, doText: e.target.value }))}
                placeholder="Do instructions…"
                rows={2}
                className="w-full text-xs bg-slate-700 border border-slate-600 rounded-md px-2 py-1.5 text-slate-200 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                aria-label="Do instructions"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={handleDefCancel} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors">
                  <X size={11} /> Cancel
                </button>
                <button onClick={handleDefSave} className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors">
                  <Save size={11} /> Save
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono text-slate-400 tabular-nums">{slot.time}</span>
                <span className={`font-bold text-sm leading-tight ${isDone ? 'text-green-300' : 'text-slate-100'}`}>
                  {slot.label}
                </span>
                {onDefinitionChange && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDefEdit(); }}
                    aria-label="Edit slot"
                    className="p-0.5 text-slate-600 hover:text-indigo-400 transition-colors"
                  >
                    <Pencil size={11} />
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 leading-snug">{slot.doText}</p>
              {/* Star row — always visible */}
              <div className="flex items-center gap-1 mt-1.5">
                {stars.map((earned, i) => <Star key={i} earned={earned} />)}
                <span className={`text-[10px] ml-1 font-semibold ${
                  earnedCount === 3 ? 'text-amber-400' : 'text-slate-500'
                }`}>
                  {earnedCount === 3 ? '★ Perfect!' : `${earnedCount}/3`}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Expand toggle */}
        {!editingDef && (
          <button
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse' : 'Expand'}
            className="flex-shrink-0 p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>

      {/* ── Expanded body ── */}
      {expanded && !editingDef && (
        <div className="px-3 pb-3 space-y-4 border-t border-slate-700/50 pt-3">

          {/* ── DO section ── */}
          <section aria-label="Do section">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Star earned={stars[0]} />
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Do</h3>
              </div>
              <Checkbox checked={isDone} label={`Mark Do as done for ${slot.label}`} onToggle={onToggle} />
            </div>
            <p className={`text-sm px-1 leading-snug ${isDone ? 'text-green-300' : 'text-slate-300'}`}>
              {slot.doText}
            </p>
          </section>

          {/* ── SAY section ── */}
          <section aria-label="Say section">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Star earned={stars[1]} />
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Say</h3>
              </div>
              <div className="flex items-center gap-2">
                {!editingSay ? (
                  <button
                    onClick={() => { setSayDraft(slot.say); setEditingSay(true); }}
                    aria-label="Edit say statements"
                    className="text-xs text-slate-500 hover:text-indigo-400 transition-colors flex items-center gap-1"
                  >
                    <Pencil size={10} /> Edit
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={handleSayCancel} className="text-xs text-slate-400 hover:text-slate-200">Cancel</button>
                    <button onClick={handleSaySave} className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300">
                      <Save size={10} /> Save
                    </button>
                  </div>
                )}
                {onSayDone && (
                  <Checkbox
                    checked={isSayDone}
                    label={`Mark Say as done for ${slot.label}`}
                    onToggle={onSayDone}
                  />
                )}
              </div>
            </div>
            <ul className="space-y-1.5">
              {SAY_LABELS.map((label, i) => (
                <li key={label} className="flex gap-2 items-start">
                  <span className="text-[10px] text-slate-500 w-14 flex-shrink-0 pt-0.5 uppercase tracking-wide">{label}:</span>
                  {editingSay ? (
                    <textarea
                      value={sayDraft[i]}
                      onChange={(e) => {
                        const next = [...sayDraft] as [string, string, string];
                        next[i] = e.target.value;
                        setSayDraft(next);
                      }}
                      rows={2}
                      className="flex-1 text-xs bg-slate-700 border border-slate-600 rounded-md px-2 py-1 text-slate-200 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className={`text-xs italic leading-snug ${isSayDone ? 'text-amber-200/80' : 'text-slate-300'}`}>
                      {slot.say[i]}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {/* ── NOTES / TASKS section ── */}
          {customPanel ? (
            <section aria-label={customPanelLabel ?? 'Task panel'}>
              <div className="flex items-center gap-2 mb-2">
                <Star earned={stars[2]} />
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  {customPanelLabel ?? 'Tasks'}
                </h3>
              </div>
              {customPanel}
            </section>
          ) : (
            <section aria-label="Notes">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Star earned={stars[2]} />
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Notes</h3>
                </div>
                <span className={`text-[10px] tabular-nums ${
                  wordCount > NOTES_WORD_GOAL ? 'text-amber-400' : 'text-slate-500'
                }`}>
                  {wordCount}/{NOTES_WORD_GOAL}+ words
                </span>
              </div>
              <textarea
                id={`notes-${slot.id}`}
                value={notes}
                onChange={(e) => onNotesChange?.(e.target.value)}
                placeholder={`Write a reflection (${NOTES_WORD_GOAL}+ words to earn ⭐)…`}
                rows={3}
                className="w-full text-xs bg-slate-700/60 border border-slate-600 rounded-md px-2.5 py-2 text-slate-200 placeholder-slate-500 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {/* Word progress bar */}
              <div className="mt-1 h-1 bg-slate-700/60 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${wordCount > NOTES_WORD_GOAL ? 'bg-amber-400' : 'bg-slate-500'}`}
                  style={{ width: `${Math.min(100, (wordCount / (NOTES_WORD_GOAL + 1)) * 100)}%` }}
                />
              </div>
            </section>
          )}
        </div>
      )}
    </article>
  );
}
