// MissionControl — Primary dashboard view with mission status, controls, and key metrics
import React, { useState, useEffect } from 'react';
import { useSchedule } from '../hooks/useSchedule';
import { useImages } from '../hooks/useImages';
import { useCommand } from '../hooks/useCommand';
import { scheduleApi, storageApi } from '../services/api';
import { cn } from '../utils/format';
import {
  Radio, Zap, RotateCcw, Send, AlertTriangle,
  Database, Image, CheckCircle, Clock, Cpu
} from 'lucide-react';

export default function MissionControl() {
  const {
    isInWindow,
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
    intervalHours,
    windowMinutes,
  } = useSchedule();

  const { setPriority, requestStatus, loading: cmdLoading, lastResult } = useCommand();
  const { images: transmittingImages } = useImages({ status: 'transmitting', limit: 10 });
  const { images: completedImages } = useImages({ status: 'complete', limit: 5 });

  const [storageStats, setStorageStats] = useState<any>(null);
  const [toast, setToast] = useState<any>(null);

  useEffect(() => {
    storageApi.stats().then(res => setStorageStats(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (lastResult) {
      setToast(lastResult);
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [lastResult]);

  return (
    <div className="space-y-6">
      {/* Mission Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Radio className="w-5 h-5" />}
          label="Downlink Window"
          value={isInWindow ? 'ACTIVE' : 'ORBITING'}
          sub={isInWindow ? downlinkCountdown : nextRevCountdown}
          color={isInWindow ? 'green' : 'amber'}
        />
        <StatCard
          icon={<RotateCcw className="w-5 h-5" />}
          label="Revolution"
          value={`${currentRevolution} / ${totalRevsToday}`}
          sub={`Every ${intervalHours}h`}
          color="blue"
        />
        <StatCard
          icon={<Image className="w-5 h-5" />}
          label="Images"
          value={`${transmittingImages?.length || 0} TX`}
          sub={`${storageStats?.completed_images || 0} stored`}
          color="purple"
        />
        <StatCard
          icon={<Database className="w-5 h-5" />}
          label="Storage"
          value={`${storageStats?.total_size_mb || 0} MB`}
          sub={`${storageStats?.completed_images || 0}/${storageStats?.max_images || 10000}`}
          color="cyan"
        />
      </div>

      {/* Priority Control */}
      <div className="bg-space-900/50 rounded-xl border border-white/10 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="w-5 h-5 text-purple-400" />
          <h3 className="font-space font-semibold text-white">Transmission Priority</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <PriorityButton
            label="CLEAR Only"
            sub="Priority 1 — Auto"
            icon="☀️"
            color="green"
            onClick={() => setPriority(1)}
            disabled={cmdLoading}
          />
          <PriorityButton
            label="CLEAR + CLOUDY"
            sub="Priority 2 — Manual"
            icon="☁️"
            color="purple"
            onClick={() => setPriority(2)}
            disabled={cmdLoading}
          />
          <PriorityButton
            label="Request Status"
            sub="Echo from satellite"
            icon="📡"
            color="blue"
            onClick={requestStatus}
            disabled={cmdLoading}
          />
        </div>
        {toast && (
          <div className={cn(
            'mt-4 p-3 rounded-lg text-sm',
            toast.error ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
          )}>
            {toast.error ? `❌ ${toast.error}` : `✅ ${toast.cmd} command queued`}
          </div>
        )}
      </div>

      {/* Active Transmissions */}
      <div className="bg-space-900/50 rounded-xl border border-white/10 p-6">
        <h3 className="font-space font-semibold text-white mb-4 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-neuronex-400" />
          Active Transmissions
        </h3>
        {transmittingImages && transmittingImages.length > 0 ? (
          <div className="space-y-3">
            {transmittingImages.map(img => (
              <TransmissionCard key={img.id} image={img} />
            ))}
          </div>
        ) : (
          <p className="text-neuronex-400 text-sm py-4">No active transmissions</p>
        )}
      </div>

      {/* Recent Completed */}
      <div className="bg-space-900/50 rounded-xl border border-white/10 p-6">
        <h3 className="font-space font-semibold text-white mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-400" />
          Recently Completed
        </h3>
        {completedImages && completedImages.length > 0 ? (
          <div className="space-y-2">
            {completedImages.map(img => (
              <div key={img.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{getClassificationIcon(img.classification)}</span>
                  <span className="text-white text-sm font-medium">{img.id}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">complete</span>
                </div>
                <span className="text-neuronex-400 text-xs">{img.completed_at ? new Date(img.completed_at).toLocaleTimeString() : ''}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-neuronex-400 text-sm py-4">No completed transmissions yet</p>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub: string;
  color: 'green' | 'amber' | 'blue' | 'purple' | 'cyan';
}) {
  const colors = {
    green: 'bg-green-500/20 text-green-400',
    amber: 'bg-amber-500/20 text-amber-400',
    blue: 'bg-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/20 text-purple-400',
    cyan: 'bg-cyan-500/20 text-cyan-400',
  };
  return (
    <div className="bg-space-900/50 rounded-xl border border-white/10 p-4">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3', colors[color])}>{icon}</div>
      <p className="text-neuronex-400 text-xs mb-1">{label}</p>
      <p className="text-white font-mono font-bold text-lg">{value}</p>
      <p className="text-neuronex-400 text-xs mt-1">{sub}</p>
    </div>
  );
}

function PriorityButton({ label, sub, icon, color, onClick, disabled }: {
  label: string; sub: string; icon: string;
  color: 'green' | 'purple' | 'blue';
  onClick: () => void; disabled: boolean;
}) {
  const colors = {
    green: 'border-green-500/30 hover:bg-green-500/20',
    purple: 'border-purple-500/30 hover:bg-purple-500/20',
    blue: 'border-blue-500/30 hover:bg-blue-500/20',
  };
  return (
    <button onClick={onClick} disabled={disabled}
      className={cn('p-4 rounded-lg border-2 transition-all text-left', colors[color])}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <h4 className="font-space font-semibold text-white text-sm">{label}</h4>
          <p className="text-neuronex-400 text-xs">{sub}</p>
        </div>
      </div>
    </button>
  );
}

function TransmissionCard({ image }: { image: any }) {
  const getClassificationIcon = (c: string | null) => {
    switch (c) {
      case 'CLEAR': return '☀️';
      case 'CLOUDY': return '☁️';
      case 'NOT_VISIBLE': return '🌫️';
      default: return '❓';
    }
  };
  return (
    <div className="flex items-center gap-4 py-3 border-b border-white/5 last:border-0">
      <span className="text-xl">{getClassificationIcon(image.classification)}</span>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{image.id}</p>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-1.5 bg-space-800 rounded-full overflow-hidden">
            <div className="h-full bg-neuronex-400 rounded-full transition-all"
              style={{ width: `${image.progress_percent || 0}%` }} />
          </div>
          <span className="text-neuronex-400 text-xs font-mono">
            {image.segments_confirmed}/{image.total_segments || '?'}
          </span>
        </div>
      </div>
      <span className="text-xs px-2 py-0.5 rounded-full bg-neuronex-500/20 text-neuronex-300">
        {(image.progress_percent || 0).toFixed(0)}%
      </span>
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