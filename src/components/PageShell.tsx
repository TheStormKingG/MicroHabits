import type { JSX, ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}

export function PageShell({ title, subtitle, action, children }: Props): JSX.Element {
  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-4 pb-3 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-800" style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}>
        <div>
          <h1 className="text-lg font-bold text-slate-100 leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </header>
      <main className="flex-1 overflow-y-auto px-4 py-4 pb-8">{children}</main>
    </div>
  );
}
