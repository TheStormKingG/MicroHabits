import { useState } from 'react';
import type { JSX, ReactNode } from 'react';
import { ChevronDown, ChevronUp, Check, MessageSquare, Pencil, Save, X } from 'lucide-react';
import type { SlotDefinition, SlotCompletion } from '../types';

interface Props {
  slot: SlotDefinition;
  completion?: SlotCompletion;
  onToggle: () => void;
  onNotesChange?: (notes: string) => void;
  onSayChange: (say: [string, string, string]) => void;
  onDefinitionChange?: (patch: Partial<Pick<SlotDefinition, 'label' | 'time' | 'doText'>>) => void;
  customPanel?: ReactNode;
  customPanelLabel?: string;
  /** When true the card starts expanded (e.g. tapped from a push notification) */
  defaultExpanded?: boolean;
}

const SAY_LABELS = ['Physical', 'Mind', 'Goal'] as const;

export function SlotCard({
  slot,
  completion,
  onToggle,
  onNotesChange,
  onSayChange,
  onDefinitionChange,
  customPanel,
  customPanelLabel,
  defaultExpanded = false,
}: Props): JSX.Element {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [editingSay, setEditingSay] = useState(false);
  const [sayDraft, setSayDraft] = useState<[string, string, string]>(slot.say);

  // Definition editing (label, time, doText)
  const [editingDef, setEditingDef] = useState(false);
  const [defDraft, setDefDraft] = useState({ label: slot.label, time: slot.time, doText: slot.doText });

  const isCompleted = completion?.completed ?? false;

  // ── Say handlers ────────────────────────────────────────────────────────────
  const handleSaySave = () => { onSayChange(sayDraft); setEditingSay(false); };
  const handleSayCancel = () => { setSayDraft(slot.say); setEditingSay(false); };

  // ── Definition handlers ──────────────────────────────────────────────────────
  const handleDefEdit = () => {
    setDefDraft({ label: slot.label, time: slot.time, doText: slot.doText });
    setEditingDef(true);
  };
  const handleDefSave = () => {
    onDefinitionChange?.(defDraft);
    setEditingDef(false);
  };
  const handleDefCancel = () => {
    setDefDraft({ label: slot.label, time: slot.time, doText: slot.doText });
    setEditingDef(false);
  };

  return (
    <article
      className={`rounded-xl border transition-all duration-200 ${
        isCompleted
          ? 'bg-green-950/30 border-green-700/40'
          : 'bg-slate-800/60 border-slate-700/50'
      }`}
      aria-label={`${slot.label} at ${slot.time}`}
    >
      {/* ── Header row ── */}
      <div className="flex items-start gap-3 p-3">
        {/* Check button */}
        <button
          onClick={onToggle}
          aria-pressed={isCompleted}
          aria-label={`${isCompleted ? 'Uncheck' : 'Check'} ${slot.label}`}
          className={`flex-shrink-0 mt-0.5 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
            isCompleted
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-slate-500 hover:border-green-500 text-transparent hover:text-green-500'
          }`}
        >
          <Check size={14} strokeWidth={3} aria-hidden="true" />
        </button>

        {/* Time + Label + Do — editable inline */}
        <div className="flex-1 min-w-0">
          {editingDef ? (
            <div className="space-y-1.5">
              <div className="flex gap-2">
                {/* Time */}
                <input
                  type="time"
                  value={defDraft.time}
                  onChange={(e) => setDefDraft((d) => ({ ...d, time: e.target.value }))}
                  className="w-24 text-xs font-mono bg-slate-700 border border-slate-600 rounded-md px-2 py-1 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  aria-label="Slot time"
                />
                {/* Label */}
                <input
                  type="text"
                  value={defDraft.label}
                  onChange={(e) => setDefDraft((d) => ({ ...d, label: e.target.value }))}
                  placeholder="Name"
                  className="flex-1 text-xs bg-slate-700 border border-slate-600 rounded-md px-2 py-1 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  aria-label="Slot name"
                />
              </div>
              {/* Do text */}
              <textarea
                value={defDraft.doText}
                onChange={(e) => setDefDraft((d) => ({ ...d, doText: e.target.value }))}
                placeholder="Do instructions…"
                rows={2}
                className="w-full text-xs bg-slate-700 border border-slate-600 rounded-md px-2 py-1.5 text-slate-200 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                aria-label="Do instructions"
              />
              {/* Save / Cancel */}
              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleDefCancel}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <X size={11} aria-hidden="true" /> Cancel
                </button>
                <button
                  onClick={handleDefSave}
                  className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors"
                >
                  <Save size={11} aria-hidden="true" /> Save
                </button>
              </div>
            </div>
          ) : (
            <div className="group flex items-start gap-1">
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-mono text-slate-400 tabular-nums flex-shrink-0">
                    {slot.time}
                  </span>
                  <span
                    className={`font-semibold text-sm leading-tight truncate ${
                      isCompleted ? 'text-green-300 line-through decoration-green-600' : 'text-slate-100'
                    }`}
                  >
                    {slot.label}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5 leading-snug">{slot.doText}</p>
              </div>
              {/* Edit definition button — visible on hover/tap */}
              {onDefinitionChange && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDefEdit(); }}
                  aria-label="Edit slot name, time and instructions"
                  className="flex-shrink-0 p-1 text-slate-600 hover:text-indigo-400 transition-colors mt-0.5"
                >
                  <Pencil size={12} aria-hidden="true" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Expand toggle — hidden while editing def to reduce clutter */}
        {!editingDef && (
          <button
            onClick={() => setExpanded((e) => !e)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse details' : 'Expand details'}
            className="flex-shrink-0 p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
          >
            {expanded ? (
              <ChevronUp size={16} aria-hidden="true" />
            ) : (
              <ChevronDown size={16} aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      {/* ── Expanded body ── */}
      {expanded && !editingDef && (
        <div className="px-3 pb-3 space-y-3 border-t border-slate-700/50 pt-3">
          {/* SAY section */}
          <section aria-label="Say statements">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Say</h3>
              {!editingSay ? (
                <button
                  onClick={() => { setSayDraft(slot.say); setEditingSay(true); }}
                  aria-label="Edit say statements"
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-400 transition-colors"
                >
                  <Pencil size={11} aria-hidden="true" /> Edit
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={handleSayCancel} className="text-xs text-slate-400 hover:text-slate-200">
                    Cancel
                  </button>
                  <button
                    onClick={handleSaySave}
                    className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300"
                  >
                    <Save size={11} aria-hidden="true" /> Save
                  </button>
                </div>
              )}
            </div>

            <ul className="space-y-1.5">
              {SAY_LABELS.map((label, i) => (
                <li key={label} className="flex gap-2 items-start">
                  <span className="text-xs text-slate-500 w-14 flex-shrink-0 pt-0.5">{label}:</span>
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
                      aria-label={`${label} statement for ${slot.label}`}
                    />
                  ) : (
                    <p className="text-xs text-slate-300 italic leading-snug">{slot.say[i]}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {/* ── Custom panel OR notes ── */}
          {customPanel ? (
            <section aria-label={customPanelLabel ?? 'Task panel'}>
              {customPanelLabel && (
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  {customPanelLabel}
                </h3>
              )}
              {customPanel}
            </section>
          ) : (
            <section aria-label="Notes">
              <label
                htmlFor={`notes-${slot.id}`}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5"
              >
                <MessageSquare size={11} aria-hidden="true" /> Notes
              </label>
              <textarea
                id={`notes-${slot.id}`}
                value={completion?.notes ?? ''}
                onChange={(e) => onNotesChange?.(e.target.value)}
                placeholder="Add a note…"
                rows={2}
                className="w-full text-xs bg-slate-700/60 border border-slate-600 rounded-md px-2.5 py-2 text-slate-200 placeholder-slate-500 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </section>
          )}
        </div>
      )}
    </article>
  );
}
