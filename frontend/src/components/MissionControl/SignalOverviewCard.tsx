import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useSignalQuality } from '../../hooks/useTelemetry';

export function SignalOverviewCard() {
  const { data: signalData } = useSignalQuality(undefined, 1);

  // Format telemetry points for the chart
  const points = signalData?.telemetry || [];
  const chartData = points.filter((t) => t.rssi !== null).map((t) => {
    const time = new Date(t.timestamp).toLocaleTimeString('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return {
      time,
      rssi: t.rssi,
    };
  });

  // Fallback points if empty
  const displayData = chartData.slice(-15);

  return (
    <div className="bg-[#0B132B]/80 backdrop-blur-md rounded-xl border border-cyan-900/30 p-5 flex flex-col justify-between hover:border-cyan-500/40 transition-colors shadow-lg shadow-black/40 h-full min-h-[220px]">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Signal Overview <span className="text-cyan-400/80 font-normal">(Live)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-mono text-emerald-400">TELEMETRY</span>
        </div>
      </div>

      <div className="w-full h-36 mt-1">
        {displayData.length === 0 ? <div className="w-full h-full flex items-center justify-center text-xs font-mono text-slate-500">NO TELEMETRY</div> : <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={displayData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="rssiGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="time"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#1e293b' }}
            />
            <YAxis
              domain={[-120, -40]}
              ticks={[-120, -100, -80, -60, -40]}
              stroke="#64748b"
              fontSize={9}
              tickLine={false}
              axisLine={{ stroke: '#1e293b' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0B132B',
                borderColor: '#0284c7',
                borderRadius: '0.5rem',
                fontSize: '11px',
                color: '#fff',
              }}
              formatter={(val: number) => [`${val} dBm`, 'RSSI']}
            />
            <Area
              type="monotone"
              dataKey="rssi"
              stroke="#06b6d4"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#rssiGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>}
      </div>
    </div>
  );
}
