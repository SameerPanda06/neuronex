// Diagnostics — System health, protocol stats, connection status
import React, { useState, useEffect } from 'react';
import { healthApi, scheduleApi, imagesApi } from '../services/api';
import { socketService } from '../services/socket';
import { cn } from '../utils/format';
import {
  Cpu, Wifi, HardDrive, Zap, Server, Activity,
  CheckCircle, AlertTriangle, XCircle, Gauge
} from 'lucide-react';

export default function Diagnostics() {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [socketStatus, setSocketStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [scheduleConfig, setScheduleConfig] = useState<any>(null);
  const [storageStats, setStorageStats] = useState<any>(null);
  const [imageCount, setImageCount] = useState(0);

  const checkBackend = async () => {
    try {
      const res = await healthApi.check();
      setBackendStatus('online');
      return res.data;
    } catch (e) {
      setBackendStatus('offline');
      return null;
    }
  };

  const checkSocket = () => {
    const isConnected = !!socketService.getConnectionState?.();
    setSocketStatus(isConnected ? 'connected' : 'disconnected');

    // Fallback: check via connect promise
    socketService.connect()
      .then(() => setSocketStatus('connected'))
      .catch(() => setSocketStatus('disconnected'));
  };

  useEffect(() => {
    checkBackend();
    checkSocket();

    Promise.all([
      scheduleApi.config().then(r => setScheduleConfig(r.data)).catch(() => {}),
      imagesApi.stats().then(r => setImageCount(r.data?.total || 0)).catch(() => {}),
      scheduleApi.state().then(r => setScheduleConfig(r.data)).catch(() => {}),
    ]);
  }, []);

  const protocolInfo = [
    { label: 'Protocol Version', value: 'v1.0' },
    { label: 'Packet Types', value: '7 (DATA, ACK, NACK, META, STATUS, DONE, CMD)' },
    { label: 'Max Payload', value: '255 bytes' },
    { label: 'Header Size', value: '36 bytes' },
    { label: 'CRC', value: 'CRC32' },
    { label: 'Frequency', value: '433 MHz' },
    { label: 'SF', value: 'SF7' },
    { label: 'Bandwidth', value: '125 kHz' },
    { label: 'CR', value: '4/5' },
    { label: 'Sync Word', value: '0x12' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="font-space font-bold text-2xl text-white">System Diagnostics</h2>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatusCard
          icon={<Server className="w-5 h-5" />}
          title="Backend API"
          status={backendStatus}
          detail="Flask + SocketIO"
        />
        <StatusCard
          icon={<Wifi className="w-5 h-5" />}
          title="WebSocket"
          status={socketStatus}
          detail={`Connected: ${socketService.getConnectionState?.() ? 'yes' : 'no'}`}
        />
        <StatusCard
          icon={<HardDrive className="w-5 h-5" />}
          title="Storage"
          status={storageStats ? 'online' : 'checking'}
          detail={storageStats ? `${storageStats.total_size_mb || 0} MB used` : 'Loading...'}
        />
      </div>

      {/* Protocol Config */}
      <div className="bg-space-900/50 rounded-xl border border-white/10 p-6">
        <h3 className="font-space font-semibold text-white mb-4 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-neuronex-400" />
          LoRa Protocol Configuration
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {protocolInfo.map(info => (
            <div key={info.label} className="bg-space-800/50 rounded-lg p-3 border border-white/5">
              <p className="text-neuronex-400 text-xs mb-1">{info.label}</p>
              <p className="text-white font-mono text-sm">{info.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Schedule Info */}
      {scheduleConfig && (
        <div className="bg-space-900/50 rounded-xl border border-white/10 p-6">
          <h3 className="font-space font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            Mission Schedule
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-space-800/50 rounded-lg p-4">
              <p className="text-neuronex-400 text-xs">Revs/Day</p>
              <p className="text-white font-mono text-xl">{scheduleConfig.revs_per_day || 12}</p>
            </div>
            <div className="bg-space-800/50 rounded-lg p-4">
              <p className="text-neuronex-400 text-xs">Interval</p>
              <p className="text-white font-mono text-xl">{scheduleConfig.interval_hours || 2}h</p>
            </div>
            <div className="bg-space-800/50 rounded-lg p-4">
              <p className="text-neuronex-400 text-xs">Downlink Window</p>
              <p className="text-white font-mono text-xl">{scheduleConfig.window_minutes || 3}min</p>
            </div>
          </div>
        </div>
      )}

      {/* Image Stats */}
      <div className="bg-space-900/50 rounded-xl border border-white/10 p-6">
        <h3 className="font-space font-semibold text-white mb-4 flex items-center gap-2">
          <Gauge className="w-5 h-5 text-purple-400" />
          Data Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-space-800/50 rounded-lg p-4">
            <p className="text-neuronex-400 text-xs">Total Images</p>
            <p className="text-white font-mono text-2xl">{imageCount}</p>
          </div>
          <div className="bg-space-800/50 rounded-lg p-4">
            <p className="text-neuronex-400 text-xs">Stored</p>
            <p className="text-white font-mono text-2xl">{storageStats?.completed_images || 0}</p>
          </div>
          <div className="bg-space-800/50 rounded-lg p-4">
            <p className="text-neuronex-400 text-xs">In Progress</p>
            <p className="text-white font-mono text-2xl">{storageStats?.in_progress || 0}</p>
          </div>
          <div className="bg-space-800/50 rounded-lg p-4">
            <p className="text-neuronex-400 text-xs">Storage Cap</p>
            <p className="text-white font-mono text-2xl">{storageStats?.max_images || 10000}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusCard({ icon, title, status, detail }: {
  icon: React.ReactNode; title: string;
  status: 'checking' | 'online' | 'offline' | 'connected' | 'disconnected';
  detail: string;
}) {
  const isOnline = status === 'online' || status === 'connected';
  const isCheck = status === 'checking';

  return (
    <div className="bg-space-900/50 rounded-xl border border-white/10 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-space-800 flex items-center justify-center">{icon}</div>
          <h3 className="text-white font-medium">{title}</h3>
        </div>
        {isCheck ? (
          <span className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse" />
        ) : isOnline ? (
          <span className="w-3 h-3 rounded-full bg-green-400" />
        ) : (
          <span className="w-3 h-3 rounded-full bg-red-400" />
        )}
      </div>
      <p className={cn(
        'text-sm font-medium mb-1',
        isCheck ? 'text-yellow-400' : isOnline ? 'text-green-400' : 'text-red-400'
      )}>
        {isCheck ? 'CHECKING...' : isOnline ? 'ONLINE' : 'OFFLINE'}
      </p>
      <p className="text-neuronex-400 text-xs">{detail}</p>
    </div>
  );
}