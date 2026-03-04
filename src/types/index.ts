// ─── Slot / Schedule ────────────────────────────────────────────────────────

export interface SlotDefinition {
  id: string;
  time: string;   // "HH:mm"
  label: string;
  doText: string;
  say: [string, string, string]; // [physical, mind, goal]
}

export interface SlotCompletion {
  completed: boolean;   // "Do" checkbox
  sayDone: boolean;     // "Say" checkbox
  notes: string;
  completedAt?: string; // ISO timestamp
}

// ─── Task Lists ──────────────────────────────────────────────────────────────

export interface TaskItem {
  id: string;
  text: string;
  done: boolean;
  createdAt: string; // ISO
}

export interface EveningReview {
  donePercent: number;
  notes: string;
  blockers: string;
  completedAt: string; // ISO
}

// ─── Day Record ──────────────────────────────────────────────────────────────

export interface DayRecord {
  /** YYYY-MM-DD */
  date: string;
  /** slotId → completion data */
  slots: Record<string, SlotCompletion>;
  todayTasks: TaskItem[];
  tomorrowTasks: TaskItem[];
  eveningReview?: EveningReview;
}

// ─── Wheel / Chart Config ─────────────────────────────────────────────────────

export interface WheelHabit {
  id: string;
  label: string;
  time: string;
  color: string;
}

export interface WheelConfig {
  daysInView: number;
  startAngleDeg: number;
  gapDeg: number;
  innerRadius: number;
  ringThickness: number;
  ringGap: number;
  dayLabelRadius: number;
  habits: WheelHabit[];
}

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
  strokeWidth: number;
}

export interface ChartReferenceLine {
  y: number;
  label: string;
  color: string;
}

export interface ChartConfig {
  rangeDays: number;
  xKey: string;
  yKey: string;
  yDomain: [number, number];
  title: string;
  series: ChartSeries[];
  referenceLines: ChartReferenceLine[];
}

// ─── Notification Settings ────────────────────────────────────────────────────

export interface NotificationSettings {
  enabled: boolean;
  minutesBefore: number;
  permission: NotificationPermission | 'default';
}

// ─── App Settings ─────────────────────────────────────────────────────────────

export interface AppSettings {
  notifications: NotificationSettings;
  customSlots: SlotDefinition[];
  theme: 'dark' | 'light';
}

// ─── Streaks ─────────────────────────────────────────────────────────────────

export interface StreakData {
  day:      number;   // consecutive 100%-complete days ending today
  week:     number;   // floor(day / 7)
  month:    number;   // floor(day / 30)
  quarter:  number;   // floor(day / 91)
  halfYear: number;   // floor(day / 182)
  year:     number;   // floor(day / 365)
  bestItemStreak: { label: string; days: number } | null;
}

// ─── Export Envelope ─────────────────────────────────────────────────────────

export interface ExportEnvelope {
  version: 2;
  exportedAt: string;
  appSettings: AppSettings;
  dayRecords: DayRecord[];
}

// ─── Chart Data Point ─────────────────────────────────────────────────────────

export interface CompletionDataPoint {
  date: string;       // display label e.g. "Feb 1"
  isoDate: string;    // YYYY-MM-DD
  completionPct: number;
}
