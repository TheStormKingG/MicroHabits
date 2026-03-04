import React from 'react';
import type { JSX } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, ListTodo, Settings } from 'lucide-react';

// Custom segmented-donut-with-percent Dashboard icon
function DashboardIcon({ size = 28, active = false }: { size?: number; active?: boolean }): JSX.Element {
  const c = size / 2;
  const stroke = size * 0.13;
  const r = c - stroke / 2 - 1;
  const circ = 2 * Math.PI * r;

  const gap  = circ * 0.025;
  const seg1 = circ * 0.40 - gap;
  const seg2 = circ * 0.30 - gap;
  const seg3 = circ * 0.24 - gap;

  const base   = active ? '#818cf8' : '#64748b';
  const accent = active ? '#c7d2fe' : '#94a3b8';
  const dim    = active ? '#4f46e5' : '#475569';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" aria-hidden="true">
      <circle cx={c} cy={c} r={r} stroke={base}   strokeWidth={stroke}
        strokeDasharray={`${seg1} ${circ - seg1}`}
        strokeDashoffset={circ * 0.25} strokeLinecap="round" />
      <circle cx={c} cy={c} r={r} stroke={accent} strokeWidth={stroke}
        strokeDasharray={`${seg2} ${circ - seg2}`}
        strokeDashoffset={circ * 0.25 - seg1 - gap} strokeLinecap="round" />
      <circle cx={c} cy={c} r={r} stroke={dim}    strokeWidth={stroke}
        strokeDasharray={`${seg3} ${circ - seg3}`}
        strokeDashoffset={circ * 0.25 - seg1 - gap - seg2 - gap} strokeLinecap="round" />
      <text x={c} y={c + size * 0.065} textAnchor="middle"
        fontSize={size * 0.30} fontWeight="700" fill={accent}
        fontFamily="system-ui, sans-serif">%</text>
    </svg>
  );
}

const TABS = [
  { to: '/schedule',  label: 'Schedule' },
  { to: '/',          label: 'Dashboard' },
  { to: '/tasks',     label: 'Tasks' },
  { to: '/settings',  label: 'Settings' },
] as const;

// Shared glass-button style helpers
const glassBase: React.CSSProperties = {
  background: 'linear-gradient(160deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
  border: '1px solid rgba(255,255,255,0.10)',
  boxShadow:
    'inset 0 1px 0 rgba(255,255,255,0.12),' +
    'inset 0 -1px 0 rgba(0,0,0,0.25),' +
    '0 4px 12px rgba(0,0,0,0.35)',
};

const glassActive: React.CSSProperties = {
  background: 'linear-gradient(160deg, rgba(99,102,241,0.30) 0%, rgba(99,102,241,0.12) 100%)',
  border: '1px solid rgba(129,140,248,0.35)',
  boxShadow:
    'inset 0 1px 0 rgba(255,255,255,0.18),' +
    'inset 0 -1px 0 rgba(0,0,0,0.20),' +
    '0 0 16px rgba(99,102,241,0.45),' +
    '0 4px 12px rgba(0,0,0,0.35)',
};

export function BottomNav(): JSX.Element {
  return (
    <nav
      aria-label="Main navigation"
      style={{
        background: 'linear-gradient(180deg, rgba(15,23,42,0.85) 0%, rgba(10,15,30,0.97) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      className="fixed bottom-0 left-0 right-0 z-50"
    >
      {/* Fixed-height icon row — safe-area padding is outside this div so icons stay centred */}
      <div className="flex justify-center items-center gap-5 max-w-lg mx-auto px-4" style={{ height: 64 }}>
        {TABS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            aria-label={label}
            className="flex items-center justify-center rounded-2xl transition-all duration-200 active:scale-95"
            style={({ isActive }) => ({
              width: 52,
              height: 48,
              ...(isActive ? glassActive : glassBase),
            })}
          >
            {({ isActive }) => {
              const sz = 28;
              const sw = isActive ? 2.5 : 1.75;
              const col = isActive ? '#a5b4fc' : '#64748b';
              if (label === 'Schedule')  return <Home      size={sz} strokeWidth={sw} color={col} aria-hidden="true" />;
              if (label === 'Dashboard') return <DashboardIcon size={sz} active={isActive} />;
              if (label === 'Tasks')     return <ListTodo  size={sz} strokeWidth={sw} color={col} aria-hidden="true" />;
              return                            <Settings  size={sz} strokeWidth={sw} color={col} aria-hidden="true" />;
            }}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
