import { useState, useEffect } from 'react';
import type { JSX } from 'react';
import { X, Save, ChevronDown, ChevronUp } from 'lucide-react';
import type { SlotDefinition } from '../types';

interface Props {
  onSave:  (slot: SlotDefinition) => void;
  onClose: () => void;
}

const DEFAULT_SAY: [string, string, string] = [
  'My body grows stronger each day.',
  'My mind is focused and clear.',
  'I am making progress toward my goals.',
];

export function AddSlotModal({ onSave, onClose }: Props): JSX.Element {
  const [time,    setTime]    = useState('12:00');
  const [label,   setLabel]   = useState('');
  const [doText,  setDoText]  = useState('');
  const [say,     setSay]     = useState<[string, string, string]>([...DEFAULT_SAY]);
  const [showSay, setShowSay] = useState(false);

  // Prevent background scroll on iOS
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

  const canSave = label.trim().length > 0 && time.length > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      id:     `custom_${Date.now()}`,
      time,
      label:  label.trim(),
      doText: doText.trim() || label.trim(),
      say:    say.map((s, i) => s.trim() || DEFAULT_SAY[i]) as [string, string, string],
    });
    onClose();
  };

  const fieldCls = 'w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />

      <div className="relative bg-slate-900 rounded-t-2xl shadow-2xl flex flex-col animate-slide-up" style={{ maxHeight: '88dvh' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-700/60 flex-shrink-0">
          <h2 className="text-base font-bold text-slate-100">New Habit Slot</h2>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div
          className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
          style={{ WebkitOverflowScrolling: 'touch' as unknown as undefined, overscrollBehavior: 'contain' }}
        >
          {/* Time + Name */}
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-28 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Name *</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Morning Walk"
                className={fieldCls}
                autoFocus
              />
            </div>
          </div>

          {/* Do instructions */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Do Instructions</label>
            <textarea
              value={doText}
              onChange={(e) => setDoText(e.target.value)}
              placeholder="e.g. Walk for 20 minutes around the block"
              rows={2}
              className={`${fieldCls} resize-none`}
            />
          </div>

          {/* Say statements — collapsible */}
          <div>
            <button
              onClick={() => setShowSay((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-full py-1"
            >
              {showSay ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              Say Statements
              <span className="ml-1 font-normal text-slate-600 normal-case">(optional)</span>
            </button>

            {showSay && (
              <div className="mt-2 space-y-2">
                {(['Physical', 'Mind', 'Goal'] as const).map((lbl, i) => (
                  <div key={lbl}>
                    <label className="block text-[10px] text-slate-500 mb-0.5">{lbl}</label>
                    <input
                      type="text"
                      value={say[i]}
                      onChange={(e) => {
                        const next = [...say] as typeof say;
                        next[i] = e.target.value;
                        setSay(next);
                      }}
                      placeholder={DEFAULT_SAY[i]}
                      className={fieldCls}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-4 py-4 border-t border-slate-700/60">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-colors"
          >
            <Save size={16} aria-hidden="true" />
            Add Habit Slot
          </button>
        </div>
      </div>
    </div>
  );
}
