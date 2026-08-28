import { useSignalQuality, getSignalQualityLabel } from '../../hooks/useTelemetry';

interface SignalMetricsCardProps {
  rssiOverride?: number | null;
  snrOverride?: number | null;
  packetsReceived?: number;
  missingCount?: number;
}

export function SignalMetricsCard({
  rssiOverride,
  snrOverride,
  packetsReceived = 1248,
  missingCount = 3,
}: SignalMetricsCardProps) {
  const { data: signalData } = useSignalQuality(undefined, 1);

  const rssi = rssiOverride ?? signalData?.stats?.rssi?.current ?? -67;
  const snr = snrOverride ?? signalData?.stats?.snr?.current ?? 11.2;
  const rssiLabel = getSignalQualityLabel(rssi);

  const getSnrLabel = (val: number) => {
    if (val >= 10) return 'EXCELLENT';
    if (val >= 5) return 'GOOD';
    if (val >= 0) return 'FAIR';
    return 'POOR';
  };

  const snrLabel = getSnrLabel(snr);

  const totalAttempted = packetsReceived + missingCount;
  const packetLossPct = totalAttempted > 0 ? ((missingCount / totalAttempted) * 100).toFixed(2) : '0.32';
  const packetLossLabel = parseFloat(packetLossPct) < 1.0 ? 'LOW' : parseFloat(packetLossPct) < 5.0 ? 'MODERATE' : 'HIGH';

  return (
    <div className="bg-[#0B132B]/80 backdrop-blur-md rounded-xl border border-cyan-900/30 p-5 flex flex-col justify-between hover:border-cyan-500/40 transition-colors shadow-lg shadow-black/40">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Signal Metrics <span className="text-cyan-400/90 font-normal">(Live)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-mono text-emerald-400 font-semibold">ONLINE</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* 1. RSSI */}
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
          <div className="text-[10px] uppercase font-semibold text-slate-400">RSSI</div>
          <div className="text-lg font-bold font-mono text-white mt-0.5">{rssi} dBm</div>
          <div className="text-[10px] font-semibold font-mono text-emerald-400 mt-1">
            {rssiLabel.toUpperCase()}
          </div>
        </div>

        {/* 2. SNR */}
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
          <div className="text-[10px] uppercase font-semibold text-slate-400">SNR</div>
          <div className="text-lg font-bold font-mono text-white mt-0.5">{typeof snr === 'number' ? snr.toFixed(1) : snr} dB</div>
          <div className="text-[10px] font-semibold font-mono text-emerald-400 mt-1">
            {snrLabel}
          </div>
        </div>

        {/* 3. PACKETS */}
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
          <div className="text-[10px] uppercase font-semibold text-slate-400">Packets</div>
          <div className="text-lg font-bold font-mono text-white mt-0.5">
            {packetsReceived.toLocaleString()}
          </div>
          <div className="text-[10px] font-semibold font-mono text-cyan-400 mt-1">
            RECEIVED
          </div>
        </div>

        {/* 4. PACKET LOSS */}
        <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80">
          <div className="text-[10px] uppercase font-semibold text-slate-400">Packet Loss</div>
          <div className="text-lg font-bold font-mono text-white mt-0.5">{packetLossPct}%</div>
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
