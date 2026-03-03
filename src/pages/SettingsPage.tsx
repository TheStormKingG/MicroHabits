import { useState, useRef, useEffect } from 'react';
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
  Cloud,
  CloudOff,
  LogOut,
  RefreshCw,
  User,
} from 'lucide-react';
import { useSchedule } from '../contexts/ScheduleContext';
import { useAuth } from '../contexts/AuthContext';
import { exportAllData, importAllData, deleteAllData } from '../db/database';
import { fullSync } from '../lib/syncService';
import {
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
  updatePushSchedule,
} from '../lib/pushService';
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

type Section = 'account' | 'notifications' | 'data' | 'privacy';

export function SettingsPage(): JSX.Element {
  const { settings, updateSettings, slots, refresh } = useSchedule();
  const { user, isLoading: authLoading, isSupabaseEnabled, signInWithGoogle, signOut } = useAuth();
  const [openSection, setOpenSection] = useState<Section | null>('account');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Full sync whenever the user signs in
  useEffect(() => {
    if (user) {
      setSyncStatus('syncing');
      fullSync(user.id)
        .then(() => {
          setSyncStatus('done');
          void refresh();
          setTimeout(() => setSyncStatus('idle'), 3000);
        })
        .catch(() => setSyncStatus('error'));
    }
  }, [user, refresh]);

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
      // Register Web Push subscription (works on iOS 16.4+ PWA + Android)
      void subscribeToPush(user?.id ?? null, slots, newSettings.notifications);
    } else {
      const newSettings: AppSettings = {
        ...settings,
        notifications: { ...notif, enabled: false },
      };
      await updateSettings(newSettings);
      void unsubscribeFromPush();
    }
  };

  const handleMinutesChange = async (minutes: number) => {
    const newSettings: AppSettings = {
      ...settings,
      notifications: { ...notif, minutesBefore: minutes },
    };
    await updateSettings(newSettings);
    // Keep server-side schedule in sync
    void updatePushSchedule(slots, newSettings.notifications);
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

  const handleManualSync = async () => {
    if (!user) return;
    setSyncStatus('syncing');
    try {
      await fullSync(user.id);
      await refresh();
      setSyncStatus('done');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch {
      setSyncStatus('error');
    }
  };

  return (
    <PageShell title="Settings">
      <div className="space-y-3">

        {/* ── Account / Cloud Sync ── */}
        <SettingsSection
          id="account"
          title="Account & Cloud Sync"
          icon={user ? Cloud : CloudOff}
          open={openSection === 'account'}
          onToggle={() => toggleSection('account')}
        >
          {!isSupabaseEnabled ? (
            <div className="text-xs text-slate-400 space-y-2">
              <p className="text-slate-300 font-semibold">Cloud sync not configured</p>
              <p>
                Add <code className="text-indigo-400">VITE_SUPABASE_URL</code> and{' '}
                <code className="text-indigo-400">VITE_SUPABASE_ANON_KEY</code> to your{' '}
                <code className="text-indigo-400">.env.local</code> file to enable cross-device
                sync. Your data remains local-only until then.
              </p>
            </div>
          ) : authLoading ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : user ? (
            <div className="space-y-4">
              {/* Signed-in state */}
              <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                  <User size={16} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-slate-200 font-medium truncate">
                    {user.user_metadata?.['full_name'] ?? 'Signed in'}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                </div>
                <span className="ml-auto flex items-center gap-1 text-xs text-green-400 flex-shrink-0">
                  <Cloud size={12} /> Synced
                </span>
              </div>

              {/* Sync status */}
              {syncStatus !== 'idle' && (
                <div
                  className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${
                    syncStatus === 'syncing'
                      ? 'bg-indigo-950/40 text-indigo-300'
                      : syncStatus === 'done'
                      ? 'bg-green-950/40 text-green-400'
                      : 'bg-red-950/40 text-red-400'
                  }`}
                >
                  {syncStatus === 'syncing' && (
                    <RefreshCw size={12} className="animate-spin flex-shrink-0" />
                  )}
                  {syncStatus === 'done' && <CheckCircle2 size={12} className="flex-shrink-0" />}
                  {syncStatus === 'error' && <AlertTriangle size={12} className="flex-shrink-0" />}
                  {syncStatus === 'syncing'
                    ? 'Syncing your data…'
                    : syncStatus === 'done'
                    ? 'All data synced successfully.'
                    : 'Sync failed. Check your connection.'}
                </div>
              )}

              {/* Manual sync */}
              <button
                onClick={() => void handleManualSync()}
                disabled={syncStatus === 'syncing'}
                className="w-full flex items-center gap-2 justify-center py-2.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg text-sm text-slate-200 transition-colors"
              >
                <RefreshCw size={14} className={syncStatus === 'syncing' ? 'animate-spin' : ''} />
                Sync now
              </button>

              {/* Sign out */}
              <button
                onClick={() => void signOut()}
                className="w-full flex items-center gap-2 justify-center py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-red-400 transition-colors"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-400 leading-relaxed">
                Sign in to sync your habits and tasks across devices. Your data is encrypted in
                transit and only accessible with your account.
              </p>
              <button
                onClick={() => void signInWithGoogle()}
                className="w-full flex items-center gap-3 justify-center py-3 bg-white hover:bg-slate-100 rounded-lg text-sm text-slate-900 font-medium transition-colors"
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </button>
              <p className="text-center text-[10px] text-slate-600">
                Only your habit data is synced. See Privacy Notice below.
              </p>
            </div>
          )}
        </SettingsSection>

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

            {/* Push support badge */}
            {isPushSupported() ? (
              <div className="flex items-center gap-2 bg-green-950/40 border border-green-700/40 rounded-lg p-3 text-xs text-green-300">
                <CheckCircle2 size={13} className="flex-shrink-0" />
                <span>
                  <strong>Background push supported</strong> — notifications will arrive even when
                  the app is closed (iOS 16.4+ / Android).
                </span>
              </div>
            ) : (
              <div className="bg-slate-700/30 rounded-lg p-3 text-xs text-slate-400 space-y-1.5 leading-relaxed">
                <p className="font-semibold text-slate-300">How notifications work</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Reminders fire while the app is open in the foreground.</li>
                  <li>For background reminders, install the app on your home screen (PWA) and open it at least once daily.</li>
                  <li>A calendar (.ics) export is available below as a fallback.</li>
                </ul>
              </div>
            )}

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
                All data is stored on your device first (IndexedDB via Dexie). If you sign in,
                your data is also encrypted in transit and stored in your private Supabase account
                — only you can access it via Row Level Security. No other user can see your data.
              </p>
            </div>

            <div>
              <p className="text-slate-300 font-medium mb-1">Third-party services</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong className="text-slate-300">Supabase</strong> — optional cloud sync & Google auth (only when signed in)</li>
                <li>No analytics, no tracking, no ads</li>
              </ul>
            </div>

            <div>
              <p className="text-slate-300 font-medium mb-1">Your controls</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Export your data at any time as JSON</li>
                <li>Import data from a previous export</li>
                <li>Delete all your data permanently</li>
                <li>Sign out to stop all cloud sync</li>
              </ul>
            </div>

            <p className="text-slate-600 text-[10px]">
              MicroHabits v2.0 · Local-first PWA · Cloud sync via Supabase (opt-in)
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
