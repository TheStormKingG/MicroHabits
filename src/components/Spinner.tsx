import type { JSX } from 'react';

export function Spinner({ size = 24 }: { size?: number }): JSX.Element {
  return (
    <div
      role="status"
      aria-label="Loading"
      style={{ width: size, height: size }}
      className="inline-block border-2 border-slate-600 border-t-indigo-400 rounded-full animate-spin"
    />
  );
}
