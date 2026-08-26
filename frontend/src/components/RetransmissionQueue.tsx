// Retransmission Queue - Visual retransmission requests
import React from 'react';
import { useState } from 'react';
import { retransmitApi } from '../services/api';
import { useRetransmissions } from '../hooks/useRetransmissions';
import { cn, formatDate } from '../utils/format';
import { AlertTriangle, CheckCircle, XCircle, RotateCcw, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

export function RetransmissionQueue() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'acknowledged' | 'completed'>('all');
  const { retransmissions, loading, refetch } = useRetransmissions({
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  return (
    <section id="retransmit" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-space font-bold text-2xl text-white">Retransmission Queue</h2>
          <p className="text-neuronex-400 text-sm">Missing segments requested by ESP32 ground station</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'pending', 'acknowledged', 'completed'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                statusFilter === filter
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  : 'bg-white/5 text-neuronex-300 hover:bg-white/10'
              )}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
          <button
            onClick={refetch}
            className="px-3 py-1.5 rounded-lg bg-white/5 text-neuronex-400 hover:bg-white/10 transition-colors flex items-center gap-1"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Pending" value={retransmissions.filter(r => r.status === 'pending').length} color="yellow" icon={<AlertTriangle className="w-5 h-5" />} />
        <StatCard label="Acknowledged" value={retransmissions.filter(r => r.status === 'acknowledged').length} color="blue" icon={<RotateCcw className="w-5 h-5" />} />
        <StatCard label="Completed" value={retransmissions.filter(r => r.status === 'completed').length} color="green" icon={<CheckCircle className="w-5 h-5" />} />
        <StatCard label="Total Segments" value={retransmissions.reduce((sum, r) => sum + r.missing_segments.length, 0)} color="red" icon={<XCircle className="w-5 h-5" />} />
      </div>

      {/* Retransmission List */}
      <div className="bg-space-900/50 rounded-xl border border-white/10 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3].map(i => (
              <RetransmissionRowSkeleton key={i} />
            ))}
          </div>
        ) : retransmissions.length === 0 ? (
          <div className="p-12 text-center text-neuronex-500">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">No retransmission requests</p>
            <p className="text-sm mt-1">All segments received successfully!</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {retransmissions.map((retrans) => (
              <RetransmissionRow key={retrans.id} retrans={retrans} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function RetransmissionRow({ retrans }: { retrans: any }) {
  const [expanded, setExpanded] = useState(false);

  const statusConfig = {
    pending: { color: 'yellow', icon: <AlertTriangle className="w-4 h-4" />, label: 'PENDING' },
    acknowledged: { color: 'blue', icon: <RotateCcw className="w-4 h-4 animate-spin" />, label: 'ACKNOWLEDGED' },
    completed: { color: 'green', icon: <CheckCircle className="w-4 h-4" />, label: 'COMPLETED' },
  };

  const config = statusConfig[retrans.status as keyof typeof statusConfig] || statusConfig.pending;

  return (
    <div className="p-4 hover:bg-white/5 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-neuronex-400 hover:text-white transition-colors"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium', getStatusBg(config.color))}>
            {config.icon}
            <span>{config.label}</span>
          </div>

          <div className="text-left">
            <p className="font-space font-semibold text-white">{retrans.image_id}</p>
            <p className="text-xs text-neuronex-400">{retrans.mission_id}</p>
          </div>

          <div className="text-left text-neuronex-400 text-sm hidden sm:block">
            <p>Requested: {formatDate(retrans.requested_at)}</p>
            {retrans.acknowledged_at && <p>Acked: {formatDate(retrans.acknowledged_at)}</p>}
            {retrans.completed_at && <p className="text-green-400">Completed: {formatDate(retrans.completed_at)}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-white/5 rounded font-mono text-xs text-neuronex-300">
            {retrans.missing_segments.length} segments
          </span>

          {retrans.status === 'pending' && (
            <button
              className="px-3 py-1.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-lg text-xs font-medium hover:bg-yellow-500/30 transition-colors flex items-center gap-1"
              onClick={() => acknowledgeRetransmission(retrans.id)}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Acknowledge
            </button>
          )}

          {retrans.status === 'acknowledged' && (
            <button
              className="px-3 py-1.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-xs font-medium hover:bg-green-500/30 transition-colors flex items-center gap-1"
              onClick={() => completeRetransmission(retrans.id)}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Complete
            </button>
          )}
        </div>
      </div>

      {/* Expanded: Missing Segments List */}
      {expanded && (
        <div className="mt-4 ml-10 pl-4 border-l border-white/10 space-y-2">
          <p className="text-xs text-neuronex-400 font-medium">Missing Segments:</p>
          <div className="flex flex-wrap gap-1">
            {retrans.missing_segments.slice(0, 50).map((seg: number) => (
              <span
                key={seg}
                className="px-2 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-xs font-mono"
              >
                #{seg}
              </span>
            ))}
            {retrans.missing_segments.length > 50 && (
              <span className="px-2 py-0.5 bg-white/10 text-neuronex-500 rounded text-xs">
                +{retrans.missing_segments.length - 50} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RetransmissionRowSkeleton() {
  return (
    <div className="p-4 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-6 h-6 bg-white/10 rounded" />
        <div className="w-24 h-5 bg-white/10 rounded" />
        <div className="w-32 h-4 bg-white/10 rounded" />
        <div className="w-32 h-4 bg-white/10 rounded" />
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  const colorMap = {
    yellow: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400',
    blue: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
    green: 'bg-green-500/20 border-green-500/30 text-green-400',
    red: 'bg-red-500/20 border-red-500/30 text-red-400',
  };

  return (
    <div className={cn('p-4 rounded-xl border', colorMap[color as keyof typeof colorMap])}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-neuronex-400">{label}</p>
          <p className="font-space font-bold text-2xl">{value}</p>
        </div>
        <div className="text-2xl">{icon}</div>
      </div>
    </div>
  );
}

function getStatusBg(color: string): string {
  const map = {
    yellow: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    blue: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    green: 'bg-green-500/20 text-green-400 border border-green-500/30',
    red: 'bg-red-500/20 text-red-400 border border-red-500/30',
  };
  return map[color as keyof typeof map] || map.yellow;
}

function acknowledgeRetransmission(id: number) {
  retransmitApi.ack({ retransmit_id: id });
}

function completeRetransmission(id: number) {
  retransmitApi.complete(id);
}