import { useState, useRef } from 'react';
import type { JSX } from 'react';
import { format } from 'date-fns';
import {
  Bell,
  BellOff,
  Download,
  Upload,
  Trash2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { useSchedule } from '../contexts/ScheduleContext';
import { exportAllData, importAllData, deleteAllData } from '../db/database';
import {
  requestNotificationPermission,
  sendTestNotification,
  canUseNotifications,
  scheduleNotificationsForToday,
} from '../utils/notifications';
import {
  buildExportEnvelope,
  validateExportEnvelope,
  downloadJSON,
  readJSONFile,
} from '../utils/dataIO';
import { PageShell } from '../components/PageShell';
import type { AppSettings } from '../types';

type Section = 'notifications' | 'data' | 'privacy';

export function SettingsPage(): JSX.Element {
  const { settings, updateSettings, slots, refresh } = useSchedule();
  const [openSection, setOpenSection] = useState<Section | null>('notifications');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleSection = (s: Section) =>
    setOpenSection((cur) => (cur === s ? null : s));

  if (!settings) return <div className="flex justify-center p-8 text-slate-400">Loading…</div>;

  const notif = settings.notifications;

  const handleEnableToggle = async () => {
    if (!canUseNotifications()) return;
    if (!notif.enabled) {
      const perm = await requestNotificationPermission();
      if (perm !== 'granted') {
        alert(
          'Notification permission denied. Please enable it in your browser settings, then try again.'
        );
        return;
      }
      const newSettings: AppSettings = {
        ...settings,
        notifications: { ...notif, enabled: true, permission: perm },
      };
      await updateSettings(newSettings);
      scheduleNotificationsForToday(slots, newSettings.notifications);
    } else {
      const newSettings: AppSettings = {
        ...settings,
        notifications: { ...notif, enabled: false },
      };
      await updateSettings(newSettings);
    }
  };

  const handleMinutesChange = async (minutes: number) => {
    const newSettings: AppSettings = {
      ...settings,
      notifications: { ...notif, minutesBefore: minutes },
    };
    await updateSettings(newSettings);
  };

  const handleExport = async () => {
    const { dayRecords, appSettings } = await exportAllData();
    const envelope = buildExportEnvelope(dayRecords, appSettings);
    const filename = `microhabits-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
    downloadJSON(envelope, filename);
  };

  const handleImport = async (file: File) => {
    setImportError(null);
    setImportSuccess(false);
    try {
      const raw = await readJSONFile(file);
      const envelope = validateExportEnvelope(raw);
      await importAllData(envelope.dayRecords, envelope.appSettings);
      await refresh();
      setImportSuccess(true);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleDeleteAll = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    await deleteAllData();
    await refresh();
    setDeleteConfirm(false);
    alert('All data has been deleted.');
  };

  return (
    <PageShell title="Settings">
      <div className="space-y-3">
        {/* ── Notifications ── */}
        <SettingsSection
          id="notifications"
          title="Notifications"
          icon={notif.enabled ? Bell : BellOff}
          open={openSection === 'notifications'}
          onToggle={() => toggleSection('notifications')}
        >
          <div className="space-y-4">
            {/* Support banner */}
            {!canUseNotifications() && (
              <div className="flex gap-2 bg-amber-950/40 border border-amber-700/40 rounded-lg p-3 text-xs text-amber-300">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                <span>
                  Your browser does not support the Notification API. Reminders will only appear
                  while the app is open.
                </span>
              </div>
            )}

            {/* Limitations notice */}
            <div className="bg-slate-700/30 rounded-lg p-3 text-xs text-slate-400 space-y-1.5 leading-relaxed">
              <p className="font-semibold text-slate-300">How notifications work</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Reminders fire using <code className="text-indigo-400">setTimeout</code> while the app is open.</li>
                <li>If the app is closed, notifications may not fire (browser/OS limitation).</li>
                <li>For reliable reminders, add the app to your home screen (PWA) and keep it open in the background.</li>
                <li>A calendar (.ics) export is available below as a fallback.</li>
              </ul>
            </div>

            {/* Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-200">Enable reminders</span>
              <Toggle
                checked={notif.enabled}
                onChange={() => void handleEnableToggle()}
                ariaLabel="Enable notifications"
                disabled={!canUseNotifications()}
              />
            </div>

            {/* Minutes before */}
            {notif.enabled && (
              <div className="flex items-center justify-between gap-4">
                <label htmlFor="minutes-before" className="text-sm text-slate-200 flex-shrink-0">
                  Remind me
                </label>
                <div className="flex items-center gap-2">
                  <select
                    id="minutes-before"
                    value={notif.minutesBefore}
                    onChange={(e) => void handleMinutesChange(Number(e.target.value))}
                    className="bg-slate-700 border border-slate-600 text-sm text-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {[1, 2, 5, 10, 15, 20, 30].map((m) => (
                      <option key={m} value={m}>
                        {m} min before
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Test */}
            {notif.enabled && (
              <button
                onClick={sendTestNotification}
                className="w-full py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-200 transition-colors"
              >
                Send test notification
              </button>
            )}
          </div>
        </SettingsSection>

        {/* ── Data ── */}
        <SettingsSection
          id="data"
          title="Your Data"
          icon={Download}
          open={openSection === 'data'}
          onToggle={() => toggleSection('data')}
        >
          <div className="space-y-3">
            {/* Export */}
            <button
              onClick={() => void handleExport()}
              className="w-full flex items-center gap-3 py-3 px-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-200 transition-colors"
            >
              <Download size={16} className="text-indigo-400" />
              Export all data (JSON)
            </button>

            {/* Import */}
            <div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-3 py-3 px-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-200 transition-colors"
              >
                <Upload size={16} className="text-teal-400" />
                Import data from JSON
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                aria-label="Import data file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImport(file);
                  e.target.value = '';
                }}
              />
              {importError && (
                <div className="mt-2 flex gap-2 bg-red-950/40 border border-red-700/40 rounded-lg p-2.5 text-xs text-red-400">
                  <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
                  {importError}
                </div>
              )}
              {importSuccess && (
                <div className="mt-2 flex gap-2 bg-green-950/40 border border-green-700/40 rounded-lg p-2.5 text-xs text-green-400">
                  <CheckCircle2 size={13} className="flex-shrink-0 mt-0.5" />
                  Data imported successfully.
                </div>
              )}
            </div>

            {/* Delete */}
            <div className="pt-2 border-t border-slate-700">
              <p className="text-xs text-slate-500 mb-2">Danger zone</p>
              <button
                onClick={() => void handleDeleteAll()}
                className={`w-full flex items-center gap-3 py-3 px-4 rounded-lg text-sm transition-colors ${
                  deleteConfirm
                    ? 'bg-red-700 hover:bg-red-600 text-white'
                    : 'bg-slate-700 hover:bg-slate-600 text-red-400'
                }`}
              >
                <Trash2 size={16} />
                {deleteConfirm ? 'Are you sure? Tap again to confirm' : 'Delete all my data'}
              </button>
              {deleteConfirm && (
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="w-full text-xs text-slate-500 mt-1.5 py-1 hover:text-slate-300"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </SettingsSection>

        {/* ── Privacy ── */}
        <SettingsSection
          id="privacy"
          title="Privacy Notice"
          icon={ShieldCheck}
          open={openSection === 'privacy'}
          onToggle={() => toggleSection('privacy')}
        >
          <div className="space-y-3 text-xs text-slate-400 leading-relaxed">
            <p className="text-slate-300 font-semibold">Local-first, private by design.</p>

            <div>
              <p className="text-slate-300 font-medium mb-1">What data is stored?</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Your daily habit completions</li>
                <li>Your task lists (today, tomorrow)</li>
                <li>Your evening review notes</li>
                <li>Your app settings (notification preferences)</li>
                <li>Your custom "Say" statements per habit slot</li>
              </ul>
            </div>

            <div>
              <p className="text-slate-300 font-medium mb-1">Where is it stored?</p>
              <p>
                All data is stored <strong className="text-slate-200">exclusively on your device</strong> using
                IndexedDB (via Dexie). No data leaves your device. No server, no cloud, no
                analytics.
              </p>
            </div>

            <div>
              <p className="text-slate-300 font-medium mb-1">Third-party services?</p>
              <p>None. No tracking, no analytics, no third-party calls of any kind.</p>
            </div>

            <div>
              <p className="text-slate-300 font-medium mb-1">Your controls</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Export your data at any time as JSON</li>
                <li>Import data from a previous export</li>
                <li>Delete all your data permanently</li>
              </ul>
            </div>

            <div>
              <p className="text-slate-300 font-medium mb-1">Future cloud sync</p>
              <p>
                If optional cloud sync is added in a future version, it will be strictly opt-in,
                require explicit consent, and use data minimization principles. You will always be
                able to stay local-only.
              </p>
            </div>

            <p className="text-slate-600 text-[10px]">
              MicroHabits v2.0 · Local-first PWA · No external connections
            </p>
          </div>
        </SettingsSection>

        {/* App version */}
        <p className="text-center text-xs text-slate-600 pt-2">
          MicroHabits 2.0 · Built with ♥ locally
        </p>
      </div>
    </PageShell>
  );
}

// ─── SettingsSection ──────────────────────────────────────────────────────────

interface SectionProps {
  id: string;
  title: string;
  icon: React.ElementType;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function SettingsSection({ id, title, icon: Icon, open, onToggle, children }: SectionProps): JSX.Element {
  return (
    <div className="bg-slate-800/60 rounded-xl border border-slate-700/50 overflow-hidden">
      <button
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`section-${id}`}
        className="flex items-center justify-between w-full px-4 py-3.5 text-left"
      >
        <div className="flex items-center gap-2.5">
          <Icon size={16} className="text-indigo-400" aria-hidden="true" />
          <span className="text-sm font-semibold text-slate-200">{title}</span>
        </div>
        {open ? (
          <ChevronUp size={16} className="text-slate-400" aria-hidden="true" />
        ) : (
          <ChevronDown size={16} className="text-slate-400" aria-hidden="true" />
        )}
      </button>
      {open && (
        <div id={`section-${id}`} className="px-4 pb-4 border-t border-slate-700/50 pt-3">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

interface ToggleProps {
  checked: boolean;
  onChange: () => void;
  ariaLabel: string;
  disabled?: boolean;
}

function Toggle({ checked, onChange, ariaLabel, disabled }: ToggleProps): JSX.Element {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 ${
        checked ? 'bg-indigo-600' : 'bg-slate-600'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
