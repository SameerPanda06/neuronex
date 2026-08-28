import { useSignalQuality, getSignalQualityLabel } from '../../hooks/useTelemetry';
import { useImagesStats } from '../../hooks/useImages';
import { useRevolutionStatus } from '../../hooks/useRevolutions';
import { Clock } from 'lucide-react';

export function KpiCards() {
  const { data: signalData } = useSignalQuality(undefined, 1);
  const { stats: imagesStats } = useImagesStats();
  const { status: revStatus } = useRevolutionStatus();

  // 1. Link Quality
  const currentRssi = signalData?.stats?.rssi?.current ?? -67;
  const qualityLabel = getSignalQualityLabel(currentRssi);
  const signalBars = Math.min(5, Math.max(1, Math.round(((currentRssi + 120) / 60) * 5)));

  // 2. AI Images (Useful = Clear + Cloudy kept)
  const usefulCount =
    (imagesStats?.by_classification?.CLEAR || 0) +
    (imagesStats?.by_classification?.CLOUDY || 0);
  const totalProcessed = imagesStats?.total || 87;

  // 3. Downlinked
  const completeCount = imagesStats?.complete || 0;
  const totalCount = imagesStats?.total || 88;
  const downlinkPct = totalCount > 0 ? ((completeCount / totalCount) * 100).toFixed(1) : '81.4';

  // 4. Next Contact
  const timeRemaining = revStatus?.time_remaining || 0;
  const timeUntilNext = revStatus?.time_until_next || 108;
  const countdownSec = revStatus?.active ? timeRemaining : timeUntilNext;
  const nextRevNum = revStatus?.next_revolution?.revolution_num || (revStatus?.revolution ? revStatus.revolution.revolution_num + 1 : 129);

  const hours = String(Math.floor(countdownSec / 3600)).padStart(2, '0');
  const mins = String(Math.floor((countdownSec % 3600) / 60)).padStart(2, '0');
  const secs = String(Math.floor(countdownSec % 60)).padStart(2, '0');
  const countdownFormatted = `${hours}:${mins}:${secs}`;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. LINK QUALITY */}
      <div className="bg-[#0B132B]/80 backdrop-blur-md rounded-xl border border-cyan-900/30 p-4 flex flex-col justify-between hover:border-cyan-500/40 transition-colors shadow-lg shadow-black/40">
        <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Link Quality
        </div>
        <div className="my-2">
          <div className="text-xl font-bold font-space text-emerald-400 tracking-wide">
            {qualityLabel.toUpperCase()}
          </div>
          <div className="text-xs text-slate-400 font-mono mt-0.5">
            {currentRssi !== null ? `${currentRssi} dBm` : '—'}
          </div>
        </div>
        <div className="flex items-end gap-1 h-3 mt-1">
          {[1, 2, 3, 4, 5].map((bar) => (
            <div
              key={bar}
              className={`w-1.5 rounded-sm transition-all ${
                bar <= signalBars
                  ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                  : 'bg-slate-700/60'
              }`}
              style={{ height: `${bar * 20}%` }}
            />
          ))}
        </div>
      </div>

      {/* 2. AI IMAGES */}
      <div className="bg-[#0B132B]/80 backdrop-blur-md rounded-xl border border-cyan-900/30 p-4 flex flex-col justify-between hover:border-cyan-500/40 transition-colors shadow-lg shadow-black/40">
        <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          AI Images
        </div>
        <div className="my-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold font-space text-emerald-400">
            {usefulCount}
          </span>
          <span className="text-xs font-medium text-slate-300">
            Useful
          </span>
        </div>
        <div className="text-xs text-slate-400 font-mono">
          {totalProcessed} Processed
        </div>
      </div>

      {/* 3. DOWNLINKED */}
      <div className="bg-[#0B132B]/80 backdrop-blur-md rounded-xl border border-cyan-900/30 p-4 flex flex-col justify-between hover:border-cyan-500/40 transition-colors shadow-lg shadow-black/40">
        <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Downlinked
        </div>
        <div className="my-2">
          <span className="text-2xl font-bold font-space text-cyan-400">
            {downlinkPct}%
          </span>
        </div>
        <div className="text-xs text-slate-400 font-mono">
          {completeCount} / {totalCount} Images
        </div>
      </div>

      {/* 4. NEXT CONTACT */}
      <div className="bg-[#0B132B]/80 backdrop-blur-md rounded-xl border border-cyan-900/30 p-4 flex flex-col justify-between hover:border-cyan-500/40 transition-colors shadow-lg shadow-black/40">
        <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase flex items-center justify-between">
          <span>Next Contact</span>
          <Clock className="w-3.5 h-3.5 text-cyan-400/80" />
        </div>
        <div className="my-2">
          <div className="text-2xl font-bold font-mono text-white tracking-tight">
            {countdownFormatted}
          </div>
        </div>
        <div className="text-xs text-slate-400 font-mono">
          Rev #{nextRevNum}
        </div>
      </div>
    </div>
  );
}
