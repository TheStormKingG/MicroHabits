import type { JSX } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, ListTodo, Settings } from 'lucide-react';

// Custom segmented-donut-with-percent icon matching the Dashboard reference image
function DashboardIcon({ size = 22, active = false }: { size?: number; active?: boolean }): JSX.Element {
  const c = size / 2;
  const stroke = size * 0.13;        // ring thickness
  const r = c - stroke / 2 - 1;     // ring radius
  const circ = 2 * Math.PI * r;

  // Three arc segments with small gaps between them
  // Segment proportions (of full circle): 42% | 30% | 22% | (6% gap total)
  const gap = circ * 0.025;          // gap between segments
  const seg1 = circ * 0.40 - gap;
  const seg2 = circ * 0.30 - gap;
  const seg3 = circ * 0.24 - gap;

  const baseColor  = active ? '#6366f1' : '#64748b';
  const accentColor = active ? '#a5b4fc' : '#94a3b8';
  const dimColor   = active ? '#4338ca' : '#475569';

  return (
    <svg
      width={size} height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      aria-hidden="true"
    >
      {/* Segment 1 — largest, top-left, base colour */}
      <circle
        cx={c} cy={c} r={r}
        stroke={baseColor}
        strokeWidth={stroke}
        strokeDasharray={`${seg1} ${circ - seg1}`}
        strokeDashoffset={circ * 0.25}   // start at 12 o'clock
        strokeLinecap="round"
      />
      {/* Segment 2 — medium, right, accent colour */}
      <circle
        cx={c} cy={c} r={r}
        stroke={accentColor}
        strokeWidth={stroke}
        strokeDasharray={`${seg2} ${circ - seg2}`}
        strokeDashoffset={circ * 0.25 - seg1 - gap}
        strokeLinecap="round"
      />
      {/* Segment 3 — small, bottom-left, dim colour */}
      <circle
        cx={c} cy={c} r={r}
        stroke={dimColor}
        strokeWidth={stroke}
        strokeDasharray={`${seg3} ${circ - seg3}`}
        strokeDashoffset={circ * 0.25 - seg1 - gap - seg2 - gap}
        strokeLinecap="round"
      />
      {/* % symbol in centre */}
      <text
        x={c} y={c + size * 0.065}
        textAnchor="middle"
        fontSize={size * 0.3}
        fontWeight="700"
        fill={accentColor}
        fontFamily="system-ui, sans-serif"
      >
        %
      </text>
    </svg>
  );
}

// Tab order: Schedule → Dashboard → Tasks → Settings
// No text labels — aria-label keeps accessibility
const TABS = [
  { to: '/schedule', label: 'Schedule' },
  { to: '/',        label: 'Dashboard' },
  { to: '/tasks',   label: 'Tasks' },
  { to: '/settings', label: 'Settings' },
] as const;

export function BottomNav(): JSX.Element {
  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex justify-around items-center h-14 max-w-lg mx-auto px-2">
        {TABS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            aria-label={label}
            className={({ isActive }) =>
              `flex items-center justify-center p-3 rounded-xl transition-all duration-150 ${
                isActive
                  ? 'text-indigo-400'
                  : 'text-slate-500 hover:text-slate-300'
              }`
            }
          >
            {({ isActive }) => {
              const sz = 24;
              if (label === 'Schedule') {
                return <Home size={sz} strokeWidth={isActive ? 2.5 : 1.75} aria-hidden="true" />;
              }
              if (label === 'Dashboard') {
                return <DashboardIcon size={sz} active={isActive} />;
              }
              if (label === 'Tasks') {
                return <ListTodo size={sz} strokeWidth={isActive ? 2.5 : 1.75} aria-hidden="true" />;
              }
              return <Settings size={sz} strokeWidth={isActive ? 2.5 : 1.75} aria-hidden="true" />;
            }}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
