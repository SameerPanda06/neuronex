import { useSignalQuality, getSignalQualityLabel } from '../../hooks/useTelemetry';

interface SignalMetricsCardProps {
  rssiOverride?: number | null;
  snrOverride?: number | null;
  packetsReceived?: number | null;
  missingCount?: number;
}

export function SignalMetricsCard({
  rssiOverride,
  snrOverride,
  packetsReceived = null,
  missingCount = 0,
}: SignalMetricsCardProps) {
  const { data: signalData } = useSignalQuality(undefined, 1);

  const rssi = rssiOverride ?? signalData?.stats?.rssi?.current ?? null;
  const snr = snrOverride ?? signalData?.stats?.snr?.current ?? null;
  const rssiLabel = getSignalQualityLabel(rssi);

  const getSnrLabel = (val: number | null) => {
    if (val === null) return 'NO SIGNAL';
    if (val >= 10) return 'EXCELLENT';
    if (val >= 5) return 'GOOD';
    if (val >= 0) return 'FAIR';
    return 'POOR';
  };

  const snrLabel = getSnrLabel(snr);
  const hasTelemetry = rssi !== null || snr !== null;

  const totalAttempted = packetsReceived === null ? 0 : packetsReceived + missingCount;
  const packetLossPct = totalAttempted > 0 ? ((missingCount / totalAttempted) * 100).toFixed(2) : null;
  const packetLossLabel = packetLossPct === null ? 'NO DATA' : parseFloat(packetLossPct) < 1.0 ? 'LOW' : parseFloat(packetLossPct) < 5.0 ? 'MODERATE' : 'HIGH';

  return (
    <div className="bg-[#0B132B]/80 backdrop-blur-md rounded-xl border border-cyan-900/30 p-5 flex flex-col justify-between hover:border-cyan-500/40 transition-colors shadow-lg shadow-black/40">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Signal Metrics <span className="text-cyan-400/90 font-normal">(Live)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${hasTelemetry ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
          <span className={`text-[10px] font-mono font-semibold ${hasTelemetry ? 'text-emerald-400' : 'text-slate-500'}`}>{hasTelemetry ? 'TELEMETRY' : 'NO DATA'}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* 1. RSSI */}
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
          <div className="text-[10px] uppercase font-semibold text-slate-400">RSSI</div>
          <div className="text-lg font-bold font-mono text-white mt-0.5">{rssi === null ? '—' : `${rssi} dBm`}</div>
          <div className="text-[10px] font-semibold font-mono text-emerald-400 mt-1">
            {rssiLabel.toUpperCase()}
          </div>
        </div>

        {/* 2. SNR */}
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
          <div className="text-[10px] uppercase font-semibold text-slate-400">SNR</div>
          <div className="text-lg font-bold font-mono text-white mt-0.5">{snr === null ? '—' : `${snr.toFixed(1)} dB`}</div>
          <div className="text-[10px] font-semibold font-mono text-emerald-400 mt-1">
            {snrLabel}
          </div>
        </div>

        {/* 3. PACKETS */}
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
          <div className="text-[10px] uppercase font-semibold text-slate-400">Packets</div>
          <div className="text-lg font-bold font-mono text-white mt-0.5">
            {packetsReceived === null ? '—' : packetsReceived.toLocaleString()}
          </div>
          <div className="text-[10px] font-semibold font-mono text-cyan-400 mt-1">
            RECEIVED
          </div>
        </div>

        {/* 4. PACKET LOSS */}
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
          <div className="text-[10px] uppercase font-semibold text-slate-400">Segment Gaps</div>
          <div className="text-lg font-bold font-mono text-white mt-0.5">{packetLossPct === null ? '—' : `${packetLossPct}%`}</div>
          <div
            className={`text-[10px] font-semibold font-mono mt-1 ${
              packetLossLabel === 'LOW' ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {packetLossLabel}
          </div>
        </div>
      </div>
    </div>
  );
}
