import type { JSX } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import type { ChartConfig, CompletionDataPoint } from '../types';

interface Props {
  config: ChartConfig;
  data: CompletionDataPoint[];
}

interface TooltipData {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipData): JSX.Element | null {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value ?? 0;
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-300 font-medium">{label}</p>
      <p className="text-indigo-400 font-bold">{value}% completion</p>
    </div>
  );
}

export function CompletionChart({ config, data }: Props): JSX.Element {
  // Show every 5th label to avoid crowding
  const tickEvery = Math.max(1, Math.floor(data.length / 6));

  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-slate-300 mb-3">{config.title}</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey={config.xKey}
            tick={{ fontSize: 9, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            interval={tickEvery - 1}
          />
          <YAxis
            domain={config.yDomain}
            tick={{ fontSize: 9, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip content={(props) => <CustomTooltip {...(props as unknown as TooltipData)} />} />
          {config.referenceLines.map((rl) => (
            <ReferenceLine
              key={rl.y}
              y={rl.y}
              stroke={rl.color}
              strokeDasharray="4 4"
              label={{ value: rl.label, position: 'insideTopRight', fontSize: 8, fill: rl.color }}
            />
          ))}
          {config.series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={s.color}
              strokeWidth={s.strokeWidth}
              dot={false}
              activeDot={{ r: 4, fill: s.color }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
