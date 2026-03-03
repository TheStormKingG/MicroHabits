import type { JSX } from 'react';
import { Download, X, Share, MoreVertical } from 'lucide-react';

interface Props {
  isIOS: boolean;
  onInstall: () => void;
  onLater: () => void;
}

export function InstallPromptModal({ isIOS, onInstall, onLater }: Props): JSX.Element {
  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-title"
    >
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onLater}
        aria-hidden="true"
      />

      {/* Card */}
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden animate-slide-up">

        {/* Close */}
        <button
          onClick={onLater}
          aria-label="Dismiss"
          className="absolute top-3 right-3 p-1.5 rounded-full text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-colors"
        >
          <X size={16} />
        </button>

        {/* App icon + header */}
        <div className="flex flex-col items-center pt-8 pb-5 px-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-900/40">
            <Download size={30} className="text-white" />
          </div>
          <h2 id="install-title" className="text-lg font-bold text-white text-center">
            Install MicroHabits
          </h2>
          <p className="mt-1.5 text-sm text-slate-400 text-center leading-relaxed">
            Add to your home screen for a native app experience — works offline, no app store needed.
          </p>
        </div>

        {/* Benefits */}
        <div className="mx-6 mb-5 bg-slate-800/60 rounded-xl px-4 py-3 space-y-2">
          {[
            'Instant launch from your home screen',
            'Full-screen, distraction-free view',
            'Works completely offline',
            'Push notifications support',
          ].map((benefit) => (
            <div key={benefit} className="flex items-center gap-2.5 text-xs text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
              {benefit}
            </div>
          ))}
        </div>

        {/* iOS-specific instructions */}
        {isIOS && (
          <div className="mx-6 mb-5 border border-amber-700/30 bg-amber-950/30 rounded-xl px-4 py-3 space-y-2">
            <p className="text-xs font-semibold text-amber-300">How to install on iPhone / iPad:</p>
            <ol className="space-y-1.5 text-xs text-amber-200/80">
              <li className="flex items-start gap-2">
                <span className="font-bold text-amber-400 flex-shrink-0">1.</span>
                Tap the{' '}
                <Share size={12} className="inline-block mx-0.5 text-amber-400 flex-shrink-0 mt-0.5" />{' '}
                <strong>Share</strong> button in Safari's toolbar
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-amber-400 flex-shrink-0">2.</span>
                Scroll down and tap <strong>"Add to Home Screen"</strong>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-amber-400 flex-shrink-0">3.</span>
                Tap <strong>"Add"</strong> to confirm
              </li>
            </ol>
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col gap-2 px-6 pb-6">
          {!isIOS && (
            <button
              onClick={onInstall}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-xl text-sm font-semibold text-white transition-colors shadow-lg shadow-indigo-900/30"
            >
              Install now
            </button>
          )}
          <button
            onClick={onLater}
            className="w-full py-2.5 rounded-xl text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            {isIOS ? 'Maybe later' : 'Not now'}
          </button>
        </div>

        {/* Subtle Android hint for non-iOS if no native prompt yet */}
        {!isIOS && (
          <p className="text-center text-[10px] text-slate-600 pb-3 -mt-2 flex items-center justify-center gap-1">
            Or tap <MoreVertical size={10} className="inline" /> → "Add to Home screen" in your browser
          </p>
        )}
      </div>
    </div>
  );
}
