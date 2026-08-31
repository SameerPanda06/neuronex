// LiveDownlink — Real-time downlink progress with 20-second orbit gap countdown
import React, { useState, useEffect, useRef } from 'react';
import { useSchedule } from '../hooks/useSchedule';
import { useImages } from '../hooks/useImages';
import { useLatestTelemetry } from '../hooks/useTelemetry';
import { socketService } from '../services/socket';
import { cn, formatBytes, formatBps } from '../utils/format';
import {
  Radio, Signal, Send, CheckCircle, Clock,
  AlertCircle, Loader2, Database, Zap
} from 'lucide-react';

export default function LiveDownlink() {
  const {
    isInWindow,
    windowActive,
    currentRevolution,
    totalRevsToday,
    downlinkCountdown,
    nextRevCountdown,
    progressPercent,
    phase,
    windowStart,
    windowEnd,
    nextRevStart,
    revsPerDay,
    windowMinutes,
  } = useSchedule();

  const { images: transmittingImages, loading } = useImages({ status: 'transmitting', limit: 10 });
  const { data: telemetryData } = useLatestTelemetry();

  // Orbit gap countdown (20 seconds between revolutions)
  const [orbitGapCountdown, setOrbitGapCountdown] = useState(20);
  const [showGapAnimation, setShowGapAnimation] = useState(false);

  useEffect(() => {
    // When downlink ends (transition from active to orbit), start 20s gap countdown
    if (!isInWindow && phase === 'orbit') {
      setShowGapAnimation(true);
      setOrbitGapCountdown(20);

      const timer = setInterval(() => {
        setOrbitGapCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setShowGapAnimation(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isInWindow, phase]);

  const latestSignal = telemetryData?.latest_overall;

  return (
    <div className="space-y-6">
      {/* Window Status Banner */}
      <div className={cn(
        'rounded-xl border-2 p-6 transition-all',
        isInWindow
          ? 'bg-green-500/10 border-green-500/30 shadow-lg shadow-green-500/10'
          : 'bg-amber-500/10 border-amber-500/30'
      )}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center',
              isInWindow ? 'bg-green-500/20' : 'bg-amber-500/20'
            )}>
              <Radio className={cn('w-6 h-6', isInWindow ? 'text-green-400' : 'text-amber-400')} />
            </div>
            <div>
              <h2 className="font-space font-bold text-xl text-white">
                {isInWindow ? 'DOWNLINK ACTIVE' : 'ORBITING — WAITING'}
              </h2>
              <p className="text-neuronex-400 text-sm">
                Revolution {currentRevolution} of {totalRevsToday} • {windowMinutes}min window
              </p>
            </div>
          </div>

          {/* Signal Quality Badge */}
          {latestSignal && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-space-800 border border-white/10 rounded-full">
              <Signal className="w-4 h-4 text-neuronex-400" />
              <span className="text-xs font-mono text-neuronex-300">
                RSSI {latestSignal.rssi}dBm / SNR {latestSignal.snr}dB
              </span>
            </div>
          )}
        </div>

        {/* Main Countdown */}
        <div className="flex items-end gap-6">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-neuronex-300">{isInWindow ? 'Time Remaining' : 'Until Next Window'}</span>
              <span className="font-mono font-bold text-2xl text-white">{downlinkCountdown}</span>
            </div>
            <div className="h-3 bg-space-800 rounded-full overflow-hidden">
              <div className={cn(
                'h-full rounded-full transition-all duration-1000',
                isInWindow ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-amber-500'
              )} style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
          {nextRevStart && (
            <div className="text-right min-w-[120px]">
              <p className="text-neuronex-400 text-xs">Next Window</p>
              <p className="font-mono font-bold text-lg text-blue-400">{nextRevCountdown}</p>
            </div>
          )}
        </div>

        {windowStart && windowEnd && (
          <p className="text-xs text-neuronex-400 mt-3">
            Window: {new Date(windowStart).toLocaleTimeString()} — {new Date(windowEnd).toLocaleTimeString()} UTC
          </p>
        )}
      </div>

      {/* 20-Second Orbit Gap Animation */}
      {showGapAnimation && orbitGapCountdown > 0 && (
        <div className="bg-space-900/80 rounded-xl border border-blue-500/30 p-6">
          <div className="flex items-center justify-center gap-4 mb-4">
            <OrbitAnimation countdown={orbitGapCountdown} />
            <div className="text-center">
              <h3 className="font-space font-semibold text-lg text-white">Satellite Orbiting</h3>
              <p className="text-neuronex-400 text-sm">Satellite traversing next orbital pass</p>
            </div>
          </div>
          <div className="text-center">
            <span className="font-mono font-bold text-4xl text-blue-400">{orbitGapCountdown}s</span>
            <p className="text-neuronex-400 text-xs mt-1">Until next downlink window opens</p>
          </div>
          <div className="mt-4 h-2 bg-space-800 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-1000"
              style={{ width: `${((20 - orbitGapCountdown) / 20) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Currently Transmitting */}
      {loading ? (
        <div className="bg-space-900/50 rounded-xl border border-white/10 p-6 animate-pulse">
          <div className="h-4 w-1/4 bg-white/10 rounded mb-4" />
          <div className="h-8 bg-white/5 rounded" />
        </div>
      ) : transmittingImages && transmittingImages.length > 0 ? (
        <div className="space-y-4">
          <h3 className="font-space font-semibold text-lg text-white flex items-center gap-2">
            <Send className="w-5 h-5 text-neuronex-400" />
            Currently Transmitting
          </h3>
          {transmittingImages.map(img => (
            <TransmissionCard key={img.id} image={img} />
          ))}
        </div>
      ) : (
        <div className="bg-space-900/50 rounded-xl border border-white/10 p-8 text-center">
          <Database className="w-12 h-12 text-neuronex-400 mx-auto mb-3 opacity-50" />
          <p className="text-neuronex-400 text-sm">No active transmissions in this window</p>
          <p className="text-neuronex-400/60 text-xs mt-1">Next window opens in {nextRevCountdown}</p>
        </div>
      )}
    </div>
  );
}

function TransmissionCard({ image }: { image: any }) {
  const getProgressColor = (pct: number) => {
    if (pct >= 100) return 'from-green-500 to-emerald-400';
    if (pct >= 60) return 'from-blue-500 to-cyan-400';
    return 'from-neuronex-500 to-neuronex-400';
  };

  return (
    <div className="bg-space-900/50 rounded-xl border border-white/10 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getClassificationIcon(image.classification)}</span>
          <div>
            <p className="text-white font-medium">{image.id}</p>
            <p className="text-neuronex-400 text-xs">Mission: {image.mission_id}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full',
            image.classification === 'CLEAR' ? 'bg-green-500/20 text-green-400' :
            image.classification === 'CLOUDY' ? 'bg-purple-500/20 text-purple-400' :
            'bg-amber-500/20 text-amber-400'
          )}>
            {image.classification || 'UNKNOWN'}
          </span>
          <span className="text-xs text-neuronex-400">P{image.priority}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-neuronex-400">Progress</span>
          <span className="text-white font-mono">{image.segments_confirmed}/{image.total_segments} segments ({(image.progress_percent || 0).toFixed(1)}%)</span>
        </div>
        <div className="h-2 bg-space-800 rounded-full overflow-hidden">
          <div className={cn('h-full bg-gradient-to-r rounded-full transition-all', getProgressColor(image.progress_percent || 0))}
            style={{ width: `${image.progress_percent || 0}%` }} />
        </div>
      </div>

      {/* Signal Metrics */}
      <div className="flex items-center gap-4 text-xs">
        {image.rssi && (
          <div className="flex items-center gap-1">
            <span className="text-neuronex-400">RSSI</span>
            <span className="font-mono text-neuronex-300">{image.rssi} dBm</span>
          </div>
        )}
        {image.snr && (
          <div className="flex items-center gap-1">
            <span className="text-neuronex-400">SNR</span>
            <span className="font-mono text-neuronex-300">{image.snr} dB</span>
          </div>
        )}
        {image.throughput_bps && (
          <div className="flex items-center gap-1">
            <span className="text-neuronex-400">Rate</span>
            <span className="font-mono text-neuronex-300">{formatBps(image.throughput_bps)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function OrbitAnimation({ countdown }: { countdown: number }) {
  // Simple rotating satellite animation
  const angle = (20 - countdown) * 18; // 360° over 20 seconds

  return (
    <div className="relative w-24 h-24">
      {/* Orbit ring */}
      <div className="absolute inset-2 border-2 border-dashed border-blue-500/30 rounded-full" />
      {/* Earth center */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full bg-blue-600/80 flex items-center justify-center text-xs">🌍</div>
      </div>
      {/* Satellite dot */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16" style={{ transform: `rotate(${angle}deg)` }}>
          <div className="w-3 h-3 bg-white rounded-full shadow-lg shadow-blue-400/50" style={{ marginLeft: '28px' }} />
        </div>
      </div>
    </div>
  );
}

function getClassificationIcon(c: string | null) {
  switch (c) {
    case 'CLEAR': return '☀️';
    case 'CLOUDY': return '☁️';
    case 'NOT_VISIBLE': return '🌫️';
    default: return '❓';
  }
}