import type { JSX } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ScheduleProvider } from './contexts/ScheduleContext';
import { TasksProvider } from './contexts/TasksContext';
import { BottomNav } from './components/BottomNav';
import { ErrorBoundary } from './components/ErrorBoundary';
import { InstallPromptModal } from './components/InstallPromptModal';
import { DashboardPage } from './pages/DashboardPage';
import { SchedulePage } from './pages/SchedulePage';
import { TasksPage } from './pages/TasksPage';
import { SettingsPage } from './pages/SettingsPage';
import { useNotificationScheduler } from './hooks/useNotificationScheduler';
import { useInstallPrompt } from './hooks/useInstallPrompt';

function AppInner(): JSX.Element {
  useNotificationScheduler();
  const { isIOS, shouldShow, prompt, dismiss } = useInstallPrompt();

  return (
    <div className="flex flex-col h-full bg-slate-950 max-w-lg mx-auto relative">
      <div className="flex-1 overflow-hidden pb-16">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<DashboardPage />} />
          </Routes>
        </ErrorBoundary>
      </div>
      <BottomNav />

      {shouldShow && (
        <InstallPromptModal
          isIOS={isIOS}
          onInstall={prompt}
          onLater={dismiss}
        />
      )}
    </div>
  );
}

export default function App(): JSX.Element {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <ScheduleProvider>
            <TasksProvider>
              <AppInner />
            </TasksProvider>
          </ScheduleProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
