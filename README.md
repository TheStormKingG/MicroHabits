# MicroHabits

A production-ready, local-first Progressive Web App (PWA) for tracking daily habits and managing tasks. Built with React, TypeScript, Vite, Tailwind CSS, and Dexie (IndexedDB).

---

## Quick Start

```bash
npm install
npm run dev        # development server at http://localhost:5173
npm run build      # production build → dist/
npm run preview    # preview production build
npm test           # run unit tests (37 tests)
```

---

## Features

### Dashboard
- **30-day SVG Habit Wheel** — radial tracker with one ring per habit, one slice per day. Tap any segment to toggle completion for that day/habit pair. Driven by `/src/data/wheel_config.json`.
- **30-day Line Chart** — completion % over the last 30 days. Driven by `/src/data/chart_config.json`.
- **Streak counter** — consecutive days with ≥ 50% completion.
- **7-day rolling average** completion.

### Schedule
- 15 default time-slot cards from `04:30 Wake` through `21:30 Sleep`.
- Each card shows: time · label · "Do" activity · three editable "Say" affirmations (Physical / Mind / Goal) · optional notes.
- Progress bar + live completion % in the header.
- Check/uncheck any slot; state persists to IndexedDB immediately.

### Tasks
- **Today's Tasks** — add / check / edit / delete tasks with inline editing.
- **Evening Review** — shows task % done + habit % done, with reflection notes and blockers.
- **Tomorrow's Tasks** — plan ahead; persisted to the next day's record.

### Settings
- **Notifications** — enable/disable with `Notification API`. Reminders fire via `setTimeout` while the app is open. Honest UX explains browser limitations and suggests adding to home screen.
- **Data Export** — full JSON backup of all day records + settings.
- **Data Import** — validates and merges a previous export.
- **Delete All Data** — two-tap confirmation, clears IndexedDB.
- **Privacy Notice** — explains local-only storage, no analytics, GDPR-friendly controls.

---

## Project Structure

```
src/
├── data/
│   ├── default_schedule.json   # 15 time-slot definitions
│   ├── wheel_config.json       # wheel geometry + habit colours
│   └── chart_config.json       # line chart axes + series
├── db/
│   └── database.ts             # Dexie DB schema + CRUD helpers
├── types/
│   └── index.ts                # all TypeScript types
├── contexts/
│   ├── ScheduleContext.tsx     # slots, dayRecord, settings
│   └── TasksContext.tsx        # today/tomorrow tasks
├── hooks/
│   └── useNotificationScheduler.ts
├── utils/
│   ├── completion.ts           # completion % calculation
│   ├── wheelMath.ts            # SVG arc geometry
│   ├── dataIO.ts               # export/import/validate
│   └── notifications.ts        # schedule, clear, test
├── components/
│   ├── HabitWheel.tsx          # responsive SVG wheel
│   ├── CompletionChart.tsx     # Recharts line chart
│   ├── SlotCard.tsx            # expandable habit slot card
│   ├── BottomNav.tsx           # tab navigation
│   ├── PageShell.tsx           # page wrapper with header
│   ├── ErrorBoundary.tsx       # React error boundary
│   └── Spinner.tsx             # loading indicator
├── pages/
│   ├── DashboardPage.tsx
│   ├── SchedulePage.tsx
│   ├── TasksPage.tsx
│   └── SettingsPage.tsx
└── test/
    ├── setup.ts
    ├── completion.test.ts
    ├── wheelMath.test.ts
    └── dataIO.test.ts
```

---

## Data Model

```ts
DayRecord {
  date: string;           // "YYYY-MM-DD" — primary key
  slots: Record<string, SlotCompletion>;
  todayTasks: TaskItem[];
  tomorrowTasks: TaskItem[];
  eveningReview?: EveningReview;
}

SlotCompletion { completed: boolean; notes: string; completedAt?: string }
TaskItem       { id, text, done, createdAt }
EveningReview  { donePercent, notes, blockers, completedAt }
```

Export format is a versioned JSON envelope (`version: 2`) containing all `DayRecord[]` and `AppSettings`.

---

## Configuration Files

### `/src/data/wheel_config.json`
Controls the SVG wheel geometry:

| Field | Default | Description |
|---|---|---|
| `daysInView` | 30 | Number of angular slices |
| `innerRadius` | 50 | Radius of the empty centre |
| `ringThickness` | 8 | px height of each habit ring |
| `ringGap` | 1 | px gap between rings |
| `dayLabelRadius` | 205 | Radius for day number labels |
| `startAngleDeg` | -90 | Day 1 angle (−90 = top) |
| `gapDeg` | 1 | Gap between daily slices |
| `habits[]` | 15 items | id, label, time, color |

### `/src/data/chart_config.json`
Controls the Recharts line chart: axes, domain, series colours, reference lines.

### `/src/data/default_schedule.json`
Array of 15 `SlotDefinition` objects. Each slot has stable `id`, `time`, `label`, `doText`, and three `say` affirmations. These IDs are used as keys in `DayRecord.slots` — **do not change IDs** once you have stored data.

---

## Notification Limitations

Web Push without a server cannot schedule notifications for a time in the future when the app is closed. This app uses the following best-effort strategy:

1. **While app is open** — `setTimeout` fires a `Notification` at `(slot time − minutesBefore)`.
2. **Service worker periodicSync** — Chrome 80+ only, requires `periodic-background-sync` permission. Fires a morning reminder when supported.
3. **Fallback suggestion** — The Settings page explains the limitations and recommends adding the app to the device home screen as a PWA for the best background behaviour.

No fake "server push" is simulated.

---

## Privacy

- **Local-first**: all data stored in IndexedDB on-device only.
- **No analytics**, no tracking, no third-party network calls.
- Export → Import → Delete controls available in Settings.
- Full privacy notice within the app.

---

## Tech Stack

| Concern | Library |
|---|---|
| Framework | React 19 + TypeScript |
| Build | Vite 7 |
| Styling | Tailwind CSS v4 |
| Storage | Dexie 4 (IndexedDB) |
| Charts | Recharts 3 |
| Date handling | date-fns 4 |
| Icons | Lucide React |
| Routing | React Router v7 |
| PWA | vite-plugin-pwa + Workbox |
| Testing | Vitest 4 + @testing-library/react |
| Wheel | Custom SVG arcs (no canvas dependency) |
