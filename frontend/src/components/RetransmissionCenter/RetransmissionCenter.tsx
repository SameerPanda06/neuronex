import { useEffect, useMemo, useState } from 'react';
import { RetransmissionHeader } from './RetransmissionHeader';
import { RetransmissionKpiStrip } from './RetransmissionKpiStrip';
import { RetransmissionTabs, type RetransmissionFilter } from './RetransmissionTabs';
import { RetransmissionTable } from './RetransmissionTable';
import { RetransmissionDetailPanel } from './RetransmissionDetailPanel';
import { useRetransmissions } from '../../hooks/useRetransmissions';
import { useConnection } from '../../hooks/useConnection';
import { WifiOff } from 'lucide-react';
import type { Retransmission } from '../../types';

export function RetransmissionCenter() {
  const [filter, setFilter] = useState<RetransmissionFilter>('all');
  const [selectedRetrans, setSelectedRetrans] = useState<Retransmission | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { connected, mode } = useConnection();
  const { retransmissions: allList, loading, acknowledge } = useRetransmissions();
  const retransmissions = useMemo(
    () => filter === 'all' ? allList : allList.filter((item) => item.status === filter),
    [allList, filter],
  );

  const isOffline = mode === 'live' && !connected;

  // Compute counts for tabs
  const counts = useMemo(() => ({
    all: allList.length,
    pending: allList.filter((r) => r.status === 'pending').length,
    acknowledged: allList.filter((r) => r.status === 'acknowledged').length,
    completed: allList.filter((r) => r.status === 'completed').length,
  }), [allList]);

  useEffect(() => {
    if (!selectedRetrans) return;
    const current = allList.find((item) => item.id === selectedRetrans.id);
    if (current) setSelectedRetrans(current);
  }, [allList, selectedRetrans]);

  const handleRetransmit = async (id: number) => {
    if (isProcessing || allList.find((item) => item.id === id)?.status !== 'pending') return;
    setIsProcessing(true);
    try {
      const succeeded = await acknowledge(id);
      if (succeeded && selectedRetrans?.id === id) {
        setSelectedRetrans((prev) =>
          prev ? { ...prev, status: 'acknowledged', acknowledged_at: new Date().toISOString() } : null
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const activeSelected = selectedRetrans ?? (retransmissions[0] || null);

  return (
    <div className="space-y-4 pb-6">
      {/* 1. Page Header */}
      <RetransmissionHeader />

      {/* 2. Top Summary KPI Strip */}
      <RetransmissionKpiStrip
        retransmissions={allList}
      />

      {/* Offline Alert */}
      {isOffline && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#180A12] border border-rose-500/40 text-rose-300 text-xs">
          <WifiOff className="w-3.5 h-3.5 text-rose-400" />
          <span>Backend Offline — Displaying Local Retransmission ARQ Buffer</span>
        </div>
      )}

      {/* 3. Filter Tabs */}
      <div className="flex items-center justify-between gap-3">
        <RetransmissionTabs
          selected={filter}
          onChange={setFilter}
          counts={counts}
        />
        <span className="text-[10px] text-slate-400 hidden sm:inline">
          Selective ARQ: <strong className="text-cyan-300">Resends only dropped chunks</strong>
        </span>
      </div>

      {/* 4. Main Two-Column Layout: Table + Detail Panel */}
      <div className="grid grid-cols-1 2xl:grid-cols-12 gap-4">
        {/* Left Column: Retransmissions Engineering Table (7 cols) */}
        <div className="2xl:col-span-7 space-y-3 min-w-0">
          <RetransmissionTable
            retransmissions={retransmissions}
            selectedId={activeSelected?.id ?? null}
            onSelect={setSelectedRetrans}
            onRetransmit={handleRetransmit}
            loading={loading && retransmissions.length === 0}
            disabled={isProcessing}
          />
        </div>

        {/* Right Column: Selected Retransmission Detail Panel (5 cols) */}
        <div className="2xl:col-span-5 min-w-0">
          <RetransmissionDetailPanel
            retransmission={activeSelected}
            onRetransmit={handleRetransmit}
            isProcessing={isProcessing}
          />
        </div>
      </div>
    </div>
  );
}
