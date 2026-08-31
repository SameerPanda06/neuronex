// RetransmissionCenter — Manage missing/retransmitted image segments
import React, { useState, useEffect } from 'react';
import { useRetransmissions } from '../hooks/useRetransmissions';
import { retransmitApi } from '../services/api';
import { cn } from '../utils/format';
import {
  RefreshCw, Image, CheckCircle, AlertTriangle,
  ListChecks, Laptop
} from 'lucide-react';

export default function RetransmissionCenter() {
  const { data, loading, refetch } = useRetransmissions();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const pendingRetrans = data?.retransmissions?.filter(r => r.status === 'pending') || [];
  const completedRetrans = data?.retransmissions?.filter(r => r.status === 'completed') || [];

  const handleAck = async (id: number) => {
    setActionLoading(`ack-${id}`);
    try {
      await retransmitApi.ack(id, {});
      refetch();
    } catch (e) {
      console.error('Failed to acknowledge:', e);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
          <RefreshCw className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h2 className="font-space font-bold text-xl text-white">Retransmission Center</h2>
          <p className="text-neuronex-400 text-sm">
            {pendingRetrans.length} pending • {completedRetrans.length} completed
          </p>
        </div>
      </div>

      {/* Pending Retransmissions */}
      <div className="bg-space-900/50 rounded-xl border border-white/10 p-6">
        <h3 className="font-space font-semibold text-white mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          Pending Retransmissions
        </h3>
        {loading ? (
          <div className="animate-pulse space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-16 bg-white/5 rounded" />)}
          </div>
        ) : pendingRetrans.length > 0 ? (
          <div className="space-y-3">
            {pendingRetrans.map(r => (
              <PendingCard key={r.id} retrans={r} onAck={handleAck} loading={actionLoading === `ack-${r.id}`} />
            ))}
          </div>
        ) : (
          <p className="text-neuronex-400 text-sm py-4 text-center">No pending retransmissions</p>
        )}
      </div>

      {/* Completed Retransmissions */}
      <div className="bg-space-900/50 rounded-xl border border-white/10 p-6">
        <h3 className="font-space font-semibold text-white mb-4 flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-green-400" />
          Completed Retransmissions
        </h3>
        {completedRetrans.length > 0 ? (
          <div className="space-y-2">
            {completedRetrans.slice(0, 20).map(r => (
              <CompletedCard key={r.id} retrans={r} />
            ))}
          </div>
        ) : (
          <p className="text-neuronex-400 text-sm py-4 text-center">No completed retransmissions yet</p>
        )}
      </div>
    </div>
  );
}

function PendingCard({ retrans, onAck, loading }: {
  retrans: any; onAck: (id: number) => void; loading: boolean;
}) {
  const missingSegments = retrans.missing_segments || [];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-space-800/50 rounded-lg border border-amber-500/20">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
          <Image className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <p className="text-white font-medium">{retrans.image_id}</p>
          <p className="text-neuronex-400 text-xs">
            Mission: {retrans.mission_id} • Missing {missingSegments.length} segments
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex flex-wrap gap-1 max-w-[200px]">
          {missingSegments.slice(0, 10).map((seg: number) => (
            <span key={seg} className="text-[10px] px-1 py-0.5 bg-space-700 border border-white/10 rounded text-neuronex-300">
              {seg}
            </span>
          ))}
          {missingSegments.length > 10 && (
            <span className="text-[10px] px-1 py-0.5 text-neuronex-400">+{missingSegments.length - 10}</span>
          )}
        </div>
        <button
          onClick={() => onAck(retrans.id)}
          disabled={loading}
          className="px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-lg text-sm text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Acknowledge'}
        </button>
      </div>
    </div>
  );
}

function CompletedCard({ retrans }: { retrans: any }) {
  return (
    <div className="flex items-center justify-between p-3 bg-space-800/50 rounded-lg border border-green-500/20">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
          <CheckCircle className="w-4 h-4 text-green-400" />
        </div>
        <div>
          <p className="text-white font-medium">{retrans.image_id}</p>
          <p className="text-neuronex-400 text-xs">
            {retrans.missing_segments?.length || 0} segments retransmitted • {retrans.completed_at ? new Date(retrans.completed_at).toLocaleString() : ''}
          </p>
        </div>
      </div>
      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">COMPLETED</span>
    </div>
  );
}